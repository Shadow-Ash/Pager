"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useUser } from "@/context/UserContext";
import CreateUsernameModal from "@/components/modals/CreateUsernameModal";
import NotificationModal from "@/components/modals/NotificationModal";

type ConnectWalletProps = {
  showLoginText?: boolean;
  showUserName?: boolean;
  showLogoutButton?: boolean;
  showAvatarDropdown?: boolean;
};

export default function ConnectWallet({
  showLoginText = true,
  showUserName = true,
  showLogoutButton = true,
  showAvatarDropdown = false,
}: ConnectWalletProps) {
  const { user, setUser } = useUser();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (showUsernameModal || showNotifications) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUsernameModal, showNotifications]);

  // A wallet/account switch must never leave the previous account authenticated in the UI.
  useEffect(() => {
    const ethereum = (window as Window & { ethereum?: { on?: (event: string, cb: (accounts: string[]) => void) => void; removeListener?: (event: string, cb: (accounts: string[]) => void) => void } }).ethereum;
    if (!ethereum?.on) return;
    const handleAccountsChanged = (accounts: string[]) => {
      const nextAddress = accounts?.[0];
      if (!nextAddress || !user || nextAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        void axios.post("/api/user/logout").catch(() => undefined);
        setUser(null);
        setIsAvatarMenuOpen(false);
      }
    };
    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [user, setUser]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      if (!(window as any).ethereum) {
        alert("Install MetaMask or another injected EVM wallet");
        return;
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts?.[0];
      if (!address) throw new Error("No wallet account was returned");

      const nonceResponse = await axios.post("/api/user/nonce", { walletAddress: address });
      const signer = await provider.getSigner(address);
      const signature = await signer.signMessage(nonceResponse.data.message);
      const verificationResponse = await axios.post("/api/user/verify", {
        walletAddress: address,
        signature,
      });

      const userData = verificationResponse.data.user;
      setUser(userData);
      if (!userData.username) setShowUsernameModal(true);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Wallet connection failed. Please approve the signature request and try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveUsername = async () => {
    if (!user || !username.trim()) return;
    try {
      setLoading(true);
      const response = await axios.post("/api/user/set-username", { username });
      setUser(response.data.user);
      setShowUsernameModal(false);
      setUsername("");
    } catch (error) {
      console.error("Username update failed:", error);
      alert("Failed to save username. Choose another username and try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/user/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("pagerUser");
      setUser(null);
      setIsAvatarMenuOpen(false);
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const displayName =
    user?.username ||
    (user?.walletAddress
      ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
      : "");
  const hasInlineContent = showLoginText || showUserName || showLogoutButton;

  return (
    <>
      <CreateUsernameModal
        open={showUsernameModal}
        username={username}
        setUsername={setUsername}
        onSave={saveUsername}
      />
      <NotificationModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <div className="flex items-center gap-3 p-1">
        {!user && (
          <button
            type="button"
            onClick={connectWallet}
            disabled={loading}
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutralDark"
          >
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}

        {user && hasInlineContent && (
          <div className="flex items-center gap-2">
            {showLoginText && <span className="hidden text-xs font-medium text-gray-500 sm:inline">Logged in as:</span>}
            {showUserName && <span className="max-w-32 truncate text-sm font-semibold text-textMainLight dark:text-textMainDark">{displayName}</span>}
            {showLogoutButton && (
              <button type="button" onClick={logout} className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-600">
                Logout
              </button>
            )}
          </div>
        )}

        {user && showAvatarDropdown && (
          <div className="relative">
            <button
              type="button"
              aria-label="Open account menu"
              aria-expanded={isAvatarMenuOpen}
              onClick={() => setIsAvatarMenuOpen((previous) => !previous)}
              className="size-10 overflow-hidden rounded-full border-2 border-primary/40 shadow-sm transition hover:scale-105"
            >
              <img
                src={user.profilePic || `https://i.pravatar.cc/150?u=${encodeURIComponent(user.username || user.walletAddress)}`}
                alt="Profile avatar"
                className="size-full object-cover"
              />
            </button>

            {isAvatarMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-borderLight/60 bg-white py-3 shadow-2xl dark:border-borderDark/70 dark:bg-cardDark">
                <div className="border-b border-borderLight/60 px-3 pb-3 dark:border-borderDark/70">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Logged in as</p>
                  <p className="truncate text-sm font-semibold text-textMainLight dark:text-textMainDark">{displayName}</p>
                </div>
                <button type="button" onClick={toggleTheme} className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold hover:bg-primary/10">
                  <span>Theme</span>
                  <span>{isDark ? "Dark" : "Light"}</span>
                </button>
                <button type="button" onClick={() => { setShowNotifications(true); setIsAvatarMenuOpen(false); }} className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-primary/10">
                  Notifications
                </button>
                <button type="button" onClick={logout} className="w-full px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
