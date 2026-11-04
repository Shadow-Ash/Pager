"use client";

import { useState } from "react";
import MediaViewer from "./MediaViewer";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { ethers } from "ethers";
import { ESCROW_ADDRESS, ESCROW_ABI } from "@/lib/contracts";
import { FaShare } from "react-icons/fa";
import { HiChatBubbleLeft } from "react-icons/hi2";
import { AiFillLike } from "react-icons/ai";

type Props = {
  submission: any;
  bounty: any;
  onApproved?: () => void;
};

export default function SubmissionCard({ submission, bounty, onApproved }: Props) {
  const { user } = useUser();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isCreator = user?.walletAddress?.toLowerCase() === bounty.creatorWallet?.toLowerCase() ||
    user?._id === bounty.creator;
  const isPending = submission.status === "pending";

  const approve = async () => {
    try {
      setLoading(true);
      if (!(window as any).ethereum) throw new Error("MetaMask not found");

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 10143n) throw new Error("Please switch to Monad Testnet");
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      if (!user || signerAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        throw new Error("Connected wallet does not match the signed-in account");
      }

      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      const tx = await escrow.approveBounty(bounty.onChainId, submission.hunterWallet);
      await tx.wait();

      await axios.post("/api/submission/approve", {
        submissionId: submission._id,
        bountyId: bounty._id,
        txHash: tx.hash,
      });

      setConfirmOpen(false);
      onApproved?.();
      alert("Funds released successfully!");
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Approval failed. Verify the transaction and wallet, then retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative ml-2 mt-3 rounded-2xl border border-primary/20 bg-primary/5 shadow-md sm:ml-10 dark:border-primary/30 dark:bg-[linear-gradient(135deg,rgba(134,107,255,0.18),rgba(255,120,180,0.10))]">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <img src={`https://i.pravatar.cc/40?u=${encodeURIComponent(submission.username || "pager-user")}`} alt="" className="size-8 rounded-full border border-primary/20" />
            <div>
              <p className="text-xs font-semibold">{submission.username || "Pager user"}</p>
              <p className="text-[10px] text-textMutedDark">{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "Recently submitted"}</p>
            </div>
          </div>
          {submission.status === "approved" && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-500">Approved</span>}
        </div>

        {submission.description && <div className="px-3 pb-2"><p className="text-xs">{submission.description}</p></div>}
        <div className="px-3 pb-3">
          <MediaViewer mediaUrl={submission.mediaUrl} lat={bounty.location?.lat} lng={bounty.location?.lng} />
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-primary/10 px-3 py-2">
          <div className="flex items-center gap-4 text-textMutedDark">
            <button type="button" aria-label="Like (not available yet)" disabled className="flex items-center gap-1 opacity-50"><AiFillLike size={20} /><span className="text-xs">0</span></button>
            <button type="button" aria-label="Comments (not available yet)" disabled className="flex items-center gap-1 opacity-50"><HiChatBubbleLeft size={20} /><span className="text-xs">0</span></button>
            <button type="button" aria-label="Share submission" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/bounty/${bounty._id}`).then(() => alert("Link copied")).catch(() => alert("Unable to copy link")); }} className="transition hover:text-green-400"><FaShare size={18} /></button>
          </div>
          {isCreator && isPending && bounty.status !== "completed" && (
            <button type="button" onClick={() => setConfirmOpen(true)} className="rounded-md bg-primary px-3 py-1 text-[10px] text-white transition hover:bg-primary/80">Approve</button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="glass-modal w-full max-w-sm space-y-4 p-6 text-center">
            <h3 className="font-semibold text-textMainLight dark:text-textMainDark">Release funds to hunter?</h3>
            <p className="text-xs text-textMutedDark">{bounty.reward} USDC will be released. Platform fee: 2%.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={loading} className="flex-1 rounded-lg border border-borderLight py-2 dark:border-borderDark">Cancel</button>
              <button type="button" onClick={approve} disabled={loading} className="flex-1 rounded-lg bg-primary py-2 text-white shadow-glow disabled:opacity-60">{loading ? "Processing..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
