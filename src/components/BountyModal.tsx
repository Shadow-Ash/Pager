"use client";

import { useCallback, useEffect, useState } from "react";
import MapPicker from "./ui/MapPicker";
import ImageUploader from "./ui/ImageUploader";
import axios from "axios";
import { useUser } from "@/context/UserContext";
import { ethers } from "ethers";
import { ESCROW_ADDRESS, USDC_ADDRESS, ESCROW_ABI, ERC20_ABI } from "@/lib/contracts";
import { IoImageSharp } from "react-icons/io5";

type Props = { open: boolean; onClose: () => void };

export default function BountyModal({ open, onClose }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const { user } = useUser();
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      const timer = setTimeout(() => setIsVisible(false), 250);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLocation = useCallback((selectedLat: number, selectedLng: number) => {
    setLat(selectedLat);
    setLng(selectedLng);
  }, []);

  const createBounty = async () => {
    if (!user) {
      alert("Connect wallet first");
      return;
    }
    if (lat === null || lng === null) {
      alert("Please select a location");
      return;
    }
    if (description.trim().length < 8 || description.trim().length > 1000) {
      alert("Description must be between 8 and 1000 characters");
      return;
    }
    if (!/^\d+(\.\d{1,6})?$/.test(reward) || Number(reward) <= 0 || Number(reward) > 100000) {
      alert("Enter a valid USDC reward (up to 6 decimal places)");
      return;
    }

    try {
      setLoading(true);
      if (!(window as any).ethereum) throw new Error("MetaMask not found");

      const ethereum = (window as any).ethereum;
      let provider = new ethers.BrowserProvider(ethereum);
      let network = await provider.getNetwork();
      if (network.chainId !== 10143n) {
        try {
          await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x279f" }] });
        } catch (switchError: any) {
          if (switchError?.code !== 4902) throw switchError;
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x279f",
              chainName: "Monad Testnet",
              rpcUrls: ["https://testnet-rpc.monad.xyz"],
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              blockExplorerUrls: ["https://explorer.monad.xyz"],
            }],
          });
        }
        provider = new ethers.BrowserProvider(ethereum);
        network = await provider.getNetwork();
        if (network.chainId !== 10143n) throw new Error("Please switch to Monad Testnet");
      }

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        throw new Error("Connected wallet changed. Reconnect and retry.");
      }

      const amountInUnits = ethers.parseUnits(reward, 6);
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const approveTx = await usdc.approve(ESCROW_ADDRESS, amountInUnits);
      await approveTx.wait();

      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      const tx = await escrow.createBounty(amountInUnits);
      await tx.wait();
      const bountyCount = await escrow.bountyCount();

      await axios.post("/api/bounty/create", {
        description: description.trim(),
        reward,
        lat,
        lng,
        mediaUrl: imageUrl,
        onChainId: Number(bountyCount),
        txHash: tx.hash,
      });

      alert("Bounty created!");
      setDescription("");
      setReward("");
      setImageUrl("");
      setLat(null);
      setLng(null);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Bounty creation failed:", error);
      alert("Bounty creation failed. Check the wallet/network and try again. If funds were locked, do not submit another transaction; retry after checking the feed.");
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <button type="button" aria-label="Close bounty dialog" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-md dark:bg-black/60" />
      <div role="dialog" aria-modal="true" aria-labelledby="create-bounty-title" className={`relative max-h-[90vh] w-[92%] max-w-lg overflow-y-auto rounded-2xl border border-primary/20 bg-white/90 p-6 shadow-xl backdrop-blur-md transition-all duration-300 dark:border-primary/30 dark:bg-cardDark/90 ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-bounty-title" className="text-lg font-bold text-textMainLight dark:text-textMainDark">Create Bounty</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-gray-400 transition hover:text-primary">×</button>
        </div>

        <div className="space-y-4">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What’s happening at this location?"
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-borderLight bg-white p-3 outline-none transition focus:ring-2 focus:ring-primary/40 dark:border-borderDark dark:bg-neutralDark"
          />
          <input
            type="number"
            min="0.000001"
            max="100000"
            step="0.000001"
            placeholder="Reward (USDC)"
            value={reward}
            onChange={(event) => setReward(event.target.value)}
            className="w-full rounded-lg border border-borderLight bg-white p-3 outline-none focus:ring-2 focus:ring-primary/40 dark:border-borderDark dark:bg-neutralDark"
          />
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <img src="/pager-icon.png" width={20} height={20} alt="" />
              Select Location
            </p>
            <MapPicker onLocationSelect={handleLocation} />
            {lat !== null && lng !== null && (
              <p className="mt-2 text-xs text-primary/70">Selected: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><IoImageSharp size={16} />Choose Image (optional)</p>
            <ImageUploader onUpload={setImageUrl} />
          </div>
          <button type="button" onClick={createBounty} disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-glow transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Processing..." : "Lock Funds & Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
