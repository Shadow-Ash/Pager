"use client";

import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useUser } from "@/context/UserContext";

export default function ConnectWallet() {
    const { user, setUser } = useUser();

    const [username, setUsername] = useState("");
    const [needsUsername, setNeedsUsername] = useState(false);
    const [loading, setLoading] = useState(false);

    const connectWallet = async () => {
        try {
            setLoading(true);

            if (!(window as any).ethereum) {
                alert("Install MetaMask");
                return;
            }

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];

            const res = await axios.post("/api/user/connect", {
                walletAddress: address,
            });

            const userData = res.data.user;

            setUser(userData);

            if (!userData.username) {
                setNeedsUsername(true);
            }

        } catch (err) {
            console.error(err);
            alert("Wallet connection failed");
        } finally {
            setLoading(false);
        }
    };

    const saveUsername = async () => {
        if (!user) return;

        try {
            const res = await axios.post("/api/user/set-username", {
                walletAddress: user.walletAddress,
                username,
            });

            setUser(res.data.user);
            setNeedsUsername(false);
        } catch (err) {
            console.error(err);
            alert("Failed to save username");
        }
    };

    // -------- LOGOUT --------
    const logout = () => {
        localStorage.removeItem("pagerUser");
        setUser(null);
        setNeedsUsername(false);
    };

    return (
        <div className="p-4">

            {/* Connect Button */}
            {!user && (
                <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="bg-black text-white px-4 py-2 rounded"
                >
                    {loading ? "Connecting..." : "Connect Wallet"}
                </button>
            )}

            {/* Logged In State */}
            {user && (
                <div className="flex items-center justify-between mb-4">
                    <p>
                        Logged in as:{" "}
                        <span className="font-semibold">
                            {user.username || user.walletAddress.slice(0, 6) + "..."}
                        </span>
                    </p>

                    <button
                        onClick={logout}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                    >
                        Logout
                    </button>
                </div>
            )}

            {/* Username Setup */}
            {needsUsername && (
                <div className="mt-4">
                    <input
                        placeholder="Choose username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="border p-2 mr-2"
                    />
                    <button
                        onClick={saveUsername}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Save
                    </button>
                </div>
            )}
        </div>
    );
}
