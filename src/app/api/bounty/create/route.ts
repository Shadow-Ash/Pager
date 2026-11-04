import { Interface, JsonRpcProvider, Contract, isAddress, parseUnits } from "ethers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionWallet } from "@/lib/auth";
import { ESCROW_ADDRESS } from "@/lib/contracts";
import Bounty from "@/models/Bounty";
import User from "@/models/User";

export const runtime = "nodejs";

const escrowInterface = new Interface(["function createBounty(uint256 amount)"]);
const escrowReadAbi = ["function bounties(uint256) view returns (address creator,uint256 amount,bool active)"];

export async function POST(req: NextRequest) {
  try {
    const walletAddress = getSessionWallet(req);
    if (!walletAddress) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const rewardText = String(body?.reward ?? "");
    const lat = body?.lat;
    const lng = body?.lng;
    const address = typeof body?.address === "string" ? body.address.trim().slice(0, 240) : "";
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl : "";
    const onChainId = Number(body?.onChainId);
    const txHash = typeof body?.txHash === "string" ? body.txHash : "";

    if (description.length < 8 || description.length > 1000) {
      return NextResponse.json({ error: "Description must be 8–1000 characters" }, { status: 400 });
    }
    if (!/^\d+(\.\d{1,6})?$/.test(rewardText)) {
      return NextResponse.json({ error: "Reward must be a positive amount with at most 6 decimals" }, { status: 400 });
    }
    const reward = Number(rewardText);
    if (!Number.isFinite(reward) || reward <= 0 || reward > 100000) {
      return NextResponse.json({ error: "Reward is outside the allowed range" }, { status: 400 });
    }
    if (
      typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180
    ) {
      return NextResponse.json({ error: "Valid map coordinates are required" }, { status: 400 });
    }
    if (!Number.isSafeInteger(onChainId) || onChainId < 1 || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Valid escrow transaction details are required" }, { status: 400 });
    }
    if (mediaUrl) {
      try {
        const parsed = new URL(mediaUrl);
        if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") throw new Error("Invalid media URL");
      } catch {
        return NextResponse.json({ error: "Media must be a valid Cloudinary HTTPS URL" }, { status: 400 });
      }
    }

    await connectDB();
    const walletRegex = new RegExp(`^${walletAddress}$`, "i");
    const user = await User.findOne({ walletAddress: walletRegex });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const duplicate = await Bounty.findOne({ transactionHash: txHash });
    if (duplicate) return NextResponse.json({ success: true, bounty: duplicate, duplicate: true });

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
      return NextResponse.json({ error: "Escrow transaction could not be verified" }, { status: 400 });
    }

    const parsed = escrowInterface.parseTransaction({ data: transaction.data, value: transaction.value });
    const expectedAmount = parseUnits(rewardText, 6);
    if (
      parsed?.name !== "createBounty" ||
      parsed.args[0] !== expectedAmount
    ) {
      return NextResponse.json({ error: "Transaction does not match the requested bounty reward" }, { status: 400 });
    }

    const escrow = new Contract(ESCROW_ADDRESS, escrowReadAbi, provider);
    const chainBounty = await escrow.bounties(onChainId);
    if (
      !isAddress(chainBounty.creator) ||
      chainBounty.creator.toLowerCase() !== walletAddress.toLowerCase() ||
      chainBounty.amount !== expectedAmount ||
      chainBounty.active !== true
    ) {
      return NextResponse.json({ error: "On-chain bounty does not match the submitted details" }, { status: 400 });
    }

    const bounty = await Bounty.create({
      creator: user._id,
      username: user.username || walletAddress,
      description,
      reward,
      location: { lat, lng, address },
      mediaUrl,
      onChainId,
      transactionHash: txHash,
    });

    return NextResponse.json({ success: true, bounty }, { status: 201 });
  } catch (error) {
    console.error("Bounty creation error:", error);
    return NextResponse.json({ error: "Unable to create bounty" }, { status: 500 });
  }
}
