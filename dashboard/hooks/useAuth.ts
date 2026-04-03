import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAgeRange, setEditAgeRange] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editRiskTolerance, setEditRiskTolerance] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {};
      setUserEmail(data.user?.email ?? null);
      const fn = meta.first_name ?? "";
      const ln = meta.last_name ?? "";
      const fullName = meta.full_name ?? (fn || ln ? `${fn} ${ln}`.trim() : null);
      setUserDisplayName(fullName);
    });
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showUserMenu]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function saveDisplayName() {
    setEditSaving(true);
    const supabase = createClient();
    const fullName = `${editName.trim()} ${editLastName.trim()}`.trim() || editName.trim();
    const { data } = await supabase.auth.updateUser({
      data: {
        first_name: editName.trim(),
        last_name: editLastName.trim(),
        full_name: fullName,
        age_range: editAgeRange,
        experience: editExperience,
        risk_tolerance: editRiskTolerance,
      },
    });
    if (data.user) setUserDisplayName(fullName || null);
    setEditSaving(false);
    setShowEditProfile(false);
  }

  return {
    userEmail, userDisplayName,
    showUserMenu, setShowUserMenu,
    userMenuRef,
    showEditProfile, setShowEditProfile,
    editName, setEditName,
    editLastName, setEditLastName,
    editAgeRange, setEditAgeRange,
    editExperience, setEditExperience,
    editRiskTolerance, setEditRiskTolerance,
    editSaving,
    signOut, saveDisplayName,
  };
}
