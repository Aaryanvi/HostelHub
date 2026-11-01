import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addToWishlist, removeFromWishlist } from "../services/wishlistService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/**
 * Keeps a per-product "saved" state (a Set of ids) plus pending flags,
 * shared by any page that renders ProductCard with a save button.
 */
export default function useWishlistToggle(initialSavedIds = []) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [savedIds, setSavedIdsState] = useState(() => new Set(initialSavedIds));
  const [pendingIds, setPendingIds] = useState(() => new Set());

  // Replace the saved list (callers may pass an array or a Set).
  const setSavedIds = useCallback((ids) => {
    setSavedIdsState(new Set(ids));
  }, []);

  // Merge more ids in (used when "Load more" appends another page).
  const addSavedIds = useCallback((ids) => {
    setSavedIdsState((prev) => new Set([...prev, ...ids]));
  }, []);

  const isSaved = useCallback((id) => savedIds.has(id), [savedIds]);
  const isPending = useCallback((id) => pendingIds.has(id), [pendingIds]);

  const toggleSave = useCallback(
    async (productId) => {
      if (!isAuthenticated) {
        toast.error("Please log in to save items.");
        navigate("/login");
        return;
      }

      setPendingIds((prev) => new Set(prev).add(productId));
      const currentlySaved = savedIds.has(productId);

      try {
        if (currentlySaved) {
          await removeFromWishlist(productId);
          setSavedIdsState((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          toast.success("Removed from saved items.");
        } else {
          await addToWishlist(productId);
          setSavedIdsState((prev) => new Set(prev).add(productId));
          toast.success("Added to saved items.");
        }
      } catch (err) {
        toast.error(err.message || "Something went wrong. Please try again.");
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [isAuthenticated, savedIds, toast, navigate]
  );

  return { isSaved, isPending, toggleSave, setSavedIds, addSavedIds };
}
