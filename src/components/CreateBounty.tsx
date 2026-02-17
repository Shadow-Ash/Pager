"use client";

import { useState } from "react";
import axios from "axios";
import { useUser } from "@/context/UserContext";

export default function CreateBounty() {
    const { user } = useUser();

    const [description, setDescription] = useState("");
    const [reward, setReward] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);

    const createBounty = async () => {
        if (!user) {
            alert("Connect wallet first");
            return;
        }

        try {
            setLoading(true);

            await axios.post("/api/bounty/create", {
                walletAddress: user.walletAddress,
                description,
                reward: Number(reward),
                lat: Number(lat),
                lng: Number(lng),
                address,
                mediaUrl: "",
            });

            alert("Bounty created!");

            setDescription("");
            setReward("");
            setLat("");
            setLng("");
            setAddress("");
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-8 bg-white shadow-md rounded-2xl p-6 border">
            <h2 className="text-xl font-semibold mb-4">Create a Bounty</h2>

            <textarea
                placeholder="Ask what's happening at a location..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-black"
                rows={3}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                    placeholder="Reward (USDC)"
                    value={reward}
                    onChange={(e) => setReward(e.target.value)}
                    className="border rounded-lg p-2"
                />

                <input
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border rounded-lg p-2"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                    placeholder="Latitude"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="border rounded-lg p-2"
                />

                <input
                    placeholder="Longitude"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="border rounded-lg p-2"
                />
            </div>

            <button
                onClick={createBounty}
                disabled={loading}
                className="w-full bg-black text-white py-2 rounded-lg hover:opacity-90 transition"
            >
                {loading ? "Posting..." : "Post Bounty"}
            </button>
        </div>
    );
}
