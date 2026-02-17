"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "@/context/UserContext";

export default function BountyFeed() {
    const [bounties, setBounties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();
    const [selectedBounty, setSelectedBounty] = useState<string | null>(null);
    const [proofText, setProofText] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    const openSubmission = (id: string) => {
        if (!user) {
            alert("Connect wallet first");
            return;
        }
        setSelectedBounty(id);
    };

    const submitProof = async () => {
        if (!selectedBounty) return;

        await axios.post("/api/submission/create", {
            walletAddress: user?.walletAddress,
            bountyId: selectedBounty,
            description: proofText,
            mediaUrl: imageUrl,
        });

        alert("Proof submitted!");
        setSelectedBounty(null);
        setProofText("");
        setImageUrl("");
    };

    useEffect(() => {
        fetchBounties();
    }, []);

    const fetchBounties = async () => {
        try {
            const res = await axios.get("/api/bounty/all");
            setBounties(res.data.bounties);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p className="text-center mt-6">Loading feed...</p>;

    if (bounties.length === 0)
        return <p className="text-center mt-6">No bounties yet</p>;

    return (
        <div className="max-w-xl mx-auto mt-6 space-y-4">
            {bounties.map((bounty) => (
                <div
                    key={bounty._id}
                    className="bg-white shadow-md rounded-xl p-4 border"
                >
                    <div className="flex justify-between mb-2">
                        <p className="font-semibold">@{bounty.username}</p>
                        <p className="text-green-600 font-medium">
                            ${bounty.reward} USDC
                        </p>
                    </div>

                    <p className="mb-3 text-gray-800">{bounty.description}</p>

                    <div className="text-sm text-gray-500">
                        📍 {bounty.location?.address || "Location not provided"}
                    </div>

                    <div className="text-xs text-gray-400 mt-2">
                        {new Date(bounty.createdAt).toLocaleString()}
                    </div>

                    <button
                        className="mt-3 bg-blue-600 text-white px-3 py-1 rounded"
                        onClick={() => openSubmission(bounty._id)}
                    >
                        Submit Proof
                    </button>
                </div>
            ))}

            {/* Global Modal */}
            {selectedBounty && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
                        <h2 className="font-bold mb-3">Submit Proof</h2>

                        <input
                            placeholder="Image URL"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="border w-full p-2 mb-2"
                        />

                        <textarea
                            placeholder="Description"
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                            className="border w-full p-2 mb-3"
                        />

                        <button
                            onClick={submitProof}
                            className="bg-green-600 text-white px-4 py-2 rounded w-full"
                        >
                            Submit
                        </button>

                        <button
                            onClick={() => setSelectedBounty(null)}
                            className="mt-2 text-gray-500 w-full"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
