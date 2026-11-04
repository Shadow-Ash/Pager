import { Contract, Interface, JsonRpcProvider } from "ethers";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionWallet } from "@/lib/auth";
import { ESCROW_ADDRESS } from "@/lib/contracts";
import Submission from "@/models/Submission";
import Bounty from "@/models/Bounty";
import User from "@/models/User";

export const runtime = "nodejs";

const escrowInterface = new Interface(["function approveBounty(uint256 bountyId,address hunter)"]);
const escrowReadAbi = ["function bounties(uint256) view returns (address creator,uint256 amount,bool active)"];

export async function POST(req: NextRequest) {
  try {
    const walletAddress = getSessionWallet(req);
    if (!walletAddress) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
    const bountyId = typeof body?.bountyId === "string" ? body.bountyId : "";
    const txHash = typeof body?.txHash === "string" ? body.txHash : "";
    if (
      !mongoose.Types.ObjectId.isValid(submissionId) ||
      !mongoose.Types.ObjectId.isValid(bountyId) ||
      !/^0x[a-fA-F0-9]{64}$/.test(txHash)
    ) {
      return NextResponse.json({ error: "Invalid approval request" }, { status: 400 });
    }

    await connectDB();
    const walletRegex = new RegExp(`^${walletAddress}$`, "i");
    const user = await User.findOne({ walletAddress: walletRegex });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const bounty = await Bounty.findOne({ _id: bountyId, creator: user._id });
    if (!bounty) return NextResponse.json({ error: "Only the bounty creator can approve submissions" }, { status: 403 });

    const submission = await Submission.findOne({ _id: submissionId, bountyId });
    if (!submission) return NextResponse.json({ error: "Submission not found for this bounty" }, { status: 404 });
    if (submission.status === "approved" && submission.payoutTxHash?.toLowerCase() === txHash.toLowerCase()) {
      return NextResponse.json({ success: true, duplicate: true });
    }
    if (submission.status !== "pending" || bounty.status !== "open") {
      return NextResponse.json({ error: "Submission or bounty is no longer pending" }, { status: 409 });
    }
    if (!bounty.onChainId || !submission.hunterWallet) {
      return NextResponse.json({ error: "Missing escrow details" }, { status: 409 });
    }

    const provider = new JsonRpcProvider(process.env.MONAD_RPC || "https://testnet-rpc.monad.xyz");
    const network = await provider.getNetwork();
    if (network.chainId !== 10143n) {
      return NextResponse.json({ error: "Escrow RPC is not connected to Monad Testnet (10143)" }, { status: 503 });
    }

    const [transaction, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);
    if (
      !transaction ||
      !receipt ||
      receipt.status !== 1 ||
      transaction.to?.toLowerCase() !== ESCROW_ADDRESS.toLowerCase() ||
      transaction.from.toLowerCase() !== walletAddress.toLowerCase()
    ) {
      return NextResponse.json({ error: "Payout transaction could not be verified" }, { status: 400 });
    }

    const parsed = escrowInterface.parseTransaction({ data: transaction.data, value: transaction.value });
    if (
      parsed?.name !== "approveBounty" ||
      parsed.args[0] !== BigInt(bounty.onChainId) ||
      String(parsed.args[1]).toLowerCase() !== submission.hunterWallet.toLowerCase()
    ) {
      return NextResponse.json({ error: "Transaction does not match this submission" }, { status: 400 });
    }

    const escrow = new Contract(ESCROW_ADDRESS, escrowReadAbi, provider);
    const chainBounty = await escrow.bounties(bounty.onChainId);
    if (
      String(chainBounty.creator).toLowerCase() !== walletAddress.toLowerCase() ||
      chainBounty.active !== false
    ) {
      return NextResponse.json({ error: "Escrow has not confirmed payout for this bounty" }, { status: 409 });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const approved = await Submission.findOneAndUpdate(
          { _id: submissionId, bountyId, status: "pending" },
          { $set: { status: "approved", payoutTxHash: txHash } },
          { new: true, session }
        );
        if (!approved) throw new Error("Submission was already processed");

        const updated = await Bounty.updateOne(
          { _id: bountyId, creator: user._id, status: "open" },
          { $set: { status: "completed" } },
          { session }
        );
        if (updated.modifiedCount !== 1) throw new Error("Bounty was already completed");
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submission approval error:", error);
    return NextResponse.json({ error: "Unable to approve submission" }, { status: 500 });
  }
}
