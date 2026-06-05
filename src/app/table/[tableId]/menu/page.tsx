"use client";

import {
  useState, useEffect, useRef, useMemo, useCallback,
} from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Search, X, Leaf, Flame, Clock, ChefHat, ShoppingBag,
  Plus, Minus, ChevronRight, AlertTriangle, MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import { useCustomer } from "@/lib/CustomerContext";
import { useCartStore, selectItemCount, selectSubtotal } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id:        string;
  name:      string;
  sortOrder: number;
}

interface Dish {
  id:          string;
  name:        string;
  description: string;
  price:       number;
  imageEmoji:  string | null;
  spiceLevel:  number;
  isVeg:       boolean;
  isVegan:     boolean;
  isGlutenFree:boolean;
  isJain:      boolean;
  allergens:   string[];
  prepTime:    number;
  isAvailable: boolean;
  isChefPick:  boolean;
  isPopular:   boolean;
  upsellIds:   string[];
  categoryId:  string;
  category:    Category;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SpiceDots({ level }: { level: number }) {
  if (level === 0) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full",
            i < level ? "bg-red-500" : "bg-cu-border"
          )}
        />
      ))}
    </span>
  );
}

function VegDot({ isVeg, isVegan }: { isVeg: boolean; isVegan: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded-sm border-2 shrink-0",
        isVegan
          ? "border-cu-green"
          : isVeg
            ? "border-cu-green"
            : "border-cu-red"
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          isVegan || isVeg ? "bg-cu-green" : "bg-cu-red"
        )}
      />
    </span>
  );
}

/** Returns allergens from the dish that overlap with the customer's dietary concerns */
function getAllergenWarnings(dish: Dish, dietaryPrefs: string[]): string[] {
  if (!dietaryPrefs.length) return [];
  const lowerPrefs = dietaryPrefs.map((p) => p.toLowerCase());
  return dish.allergens.filter((a) =>
    lowerPrefs.some((p) => p.includes(a.toLowerCase()) || a.toLowerCase().includes(p))
  );
}

// ---------------------------------------------------------------------------
// Add-to-Cart Bottom Sheet
// ---------------------------------------------------------------------------

function AddToCartSheet({
  dish,
  onClose,
}: {
  dish:    Dish;
  onClose: () => void;
}) {
  const [qty,   setQty]   = useState(1);
  const [notes, setNotes] = useState("");
  const addItem           = useCartStore((s) => s.addItem);

  function handleAdd() {
    addItem({
      dishId:      dish.id,
      name:        dish.name,
      price:       dish.price,
      quantity:    qty,
      imageEmoji:  dish.imageEmoji ?? undefined,
      specialInst: notes.trim() || undefined,
      allergens:   dish.allergens,
    });
    onClose();
  }

  // Prevent body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-3xl bg-cu-surface pb-safe">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-cu-border" />
        </div>

        <div className="px-5 pt-2 pb-6">
          {/* Dish summary */}
          <div className="flex items-center gap-3 mb-5">
            {dish.imageEmoji && (
              <div className="w-14 h-14 rounded-2xl bg-cu-bg flex items-center justify-center text-3xl shrink-0 border border-cu-border">
                {dish.imageEmoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-cu-text leading-tight">{dish.name}</h3>
              <p className="text-cu-accent font-semibold mt-0.5">{formatCurrency(dish.price)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-cu-bg text-cu-muted hover:bg-cu-border transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium text-cu-text">Quantity</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-full border-2 border-cu-border flex items-center justify-center text-cu-muted hover:border-cu-accent hover:text-cu-accent transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-display text-xl font-bold text-cu-text">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-full border-2 border-cu-accent bg-cu-accent flex items-center justify-center text-white hover:bg-cu-accent/90 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Special instructions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-cu-text mb-1.5">
              Special instructions
              <span className="ml-2 text-xs font-normal text-cu-muted">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. No onions, extra spicy, sauce on the side…"
              rows={2}
              className="w-full rounded-2xl border border-cu-border bg-cu-bg px-4 py-3 text-sm text-cu-text placeholder:text-cu-muted/60 focus:border-cu-accent focus:outline-none focus:ring-2 focus:ring-cu-accent/20 resize-none"
            />
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-between rounded-2xl bg-cu-accent px-5 py-3.5 text-white font-semibold hover:bg-cu-accent/90 active:scale-[0.98] transition-all"
          >
            <span className="text-sm opacity-80">{qty} item{qty > 1 ? "s" : ""}</span>
            <span>Add to Order</span>
            <span className="font-bold">{formatCurrency(dish.price * qty)}</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dish Detail Sheet (full info + upsell + ask waiter)
// ---------------------------------------------------------------------------

function DishDetailSheet({
  dish,
  waiterName,
  waiterAvatar,
  relatedDishes,
  dietaryPrefs,
  onClose,
  onAddToCart,
}: {
  dish:         Dish;
  waiterName:   string;
  waiterAvatar: string;
  relatedDishes:Dish[];
  dietaryPrefs: string[];
  onClose:      () => void;
  onAddToCart:  (dish: Dish) => void;
}) {
  const router       = useRouter();
  const params       = useParams<{ tableId: string }>();
  const searchParams = useSearchParams();
  const slug         = searchParams.get("restaurant") ?? "";
  const warnings     = getAllergenWarnings(dish, dietaryPrefs);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function goToChat() {
    onClose();
    router.push(`/table/${params.tableId}/chat?restaurant=${slug}`);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-3xl bg-cu-surface max-h-[90dvh] overflow-y-auto">
        {/* Handle */}
        <div className="sticky top-0 z-10 bg-cu-surface pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-cu-border" />
        </div>

        <div className="px-5 pb-8">
          {/* Hero */}
          <div className="relative rounded-3xl bg-gradient-to-br from-cu-bg to-cu-border/40 p-6 mb-5 text-center overflow-hidden">
            {dish.isChefPick && (
              <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-cu-maroon px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
                <ChefHat size={10} /> Chef&apos;s Pick
              </span>
            )}
            <div className="text-7xl mb-3">{dish.imageEmoji ?? "🍽️"}</div>
            <h2 className="font-display text-2xl font-bold text-cu-text">{dish.name}</h2>
            <div className="flex items-center justify-center gap-3 mt-2">
              <VegDot isVeg={dish.isVeg} isVegan={dish.isVegan} />
              <span className="text-2xl font-display font-bold text-cu-accent">{formatCurrency(dish.price)}</span>
              <SpiceDots level={dish.spiceLevel} />
            </div>
          </div>

          {/* Allergen warning */}
          {warnings.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 mb-4 flex items-start gap-2">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">
                <span className="font-semibold">Contains {warnings.join(", ")}</span> — you indicated {warnings.length > 1 ? "these allergies" : "this allergy"}.
              </p>
            </div>
          )}

          {/* Description */}
          <p className="text-cu-text/80 leading-relaxed mb-5">{dish.description}</p>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl bg-cu-bg border border-cu-border p-3">
              <div className="flex items-center gap-1.5 text-cu-muted text-xs mb-1">
                <Clock size={11} /> Prep time
              </div>
              <p className="font-semibold text-cu-text">{dish.prepTime} min</p>
            </div>
            <div className="rounded-2xl bg-cu-bg border border-cu-border p-3">
              <div className="flex items-center gap-1.5 text-cu-muted text-xs mb-1">
                <Flame size={11} /> Spice level
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <SpiceDots level={dish.spiceLevel} />
                {dish.spiceLevel === 0 && <span className="text-sm text-cu-muted">Not spicy</span>}
              </div>
            </div>
          </div>

          {/* Dietary */}
          <div className="flex flex-wrap gap-2 mb-5">
            {dish.isVegan     && <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">🌱 Vegan</span>}
            {dish.isVeg && !dish.isVegan && <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">🥦 Vegetarian</span>}
            {dish.isGlutenFree && <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">🌾 Gluten-Free</span>}
            {dish.isJain       && <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700">🔮 Jain</span>}
          </div>

          {/* Allergens */}
          {dish.allergens.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cu-muted mb-2">Contains allergens</p>
              <div className="flex flex-wrap gap-1.5">
                {dish.allergens.map((a) => (
                  <span
                    key={a}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium border",
                      warnings.includes(a)
                        ? "bg-red-100 border-red-200 text-red-700"
                        : "bg-cu-bg border-cu-border text-cu-muted"
                    )}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Goes well with */}
          {relatedDishes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cu-muted mb-3">Goes well with</p>
              <div className="space-y-2">
                {relatedDishes.map((rd) => (
                  <div key={rd.id} className="flex items-center gap-3 rounded-2xl border border-cu-border bg-cu-bg p-3">
                    <span className="text-2xl">{rd.imageEmoji ?? "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-cu-text text-sm">{rd.name}</p>
                      <p className="text-xs text-cu-muted">{formatCurrency(rd.price)}</p>
                    </div>
                    <button
                      onClick={() => onAddToCart(rd)}
                      className="shrink-0 w-8 h-8 rounded-full bg-cu-accent/10 text-cu-accent flex items-center justify-center hover:bg-cu-accent hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ask waiter */}
          <button
            onClick={goToChat}
            className="w-full flex items-center gap-3 rounded-2xl border border-cu-border bg-cu-bg px-4 py-3 mb-4 hover:border-cu-accent/40 transition-colors"
          >
            <span className="text-2xl">{waiterAvatar}</span>
            <span className="flex-1 text-left text-sm text-cu-text">
              Ask <span className="font-semibold">{waiterName}</span> about this dish
            </span>
            <MessageCircle size={16} className="text-cu-muted" />
          </button>

          {/* Add to cart CTA */}
          <button
            onClick={() => { onClose(); onAddToCart(dish); }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-cu-accent px-5 py-4 text-white font-semibold text-base hover:bg-cu-accent/90 active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            Add to Order — {formatCurrency(dish.price)}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dish Card
// ---------------------------------------------------------------------------

function DishCard({
  dish,
  dietaryPrefs,
  onTap,
  onAdd,
}: {
  dish:         Dish;
  dietaryPrefs: string[];
  onTap:        (dish: Dish) => void;
  onAdd:        (dish: Dish) => void;
}) {
  const warnings  = getAllergenWarnings(dish, dietaryPrefs);
  const cartItems = useCartStore((s) => s.items);
  const inCart    = cartItems.find((i) => i.dishId === dish.id);

  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-2xl bg-cu-surface border p-3.5 cursor-pointer",
        "hover:border-cu-accent/30 hover:shadow-sm transition-all duration-200",
        warnings.length > 0 ? "border-red-200" : "border-cu-border"
      )}
      onClick={() => onTap(dish)}
    >
      {/* Allergen warning strip */}
      {warnings.length > 0 && (
        <div className="absolute top-0 left-0 right-0 rounded-t-2xl bg-red-50 border-b border-red-100 px-3.5 py-1.5 flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-red-500 shrink-0" />
          <p className="text-[11px] text-red-600 font-medium leading-none">
            Contains {warnings.join(", ")} — matches your allergy
          </p>
        </div>
      )}

      <div className={cn("contents", warnings.length > 0 && "mt-6")}>
        {/* Image */}
        <div
          className={cn(
            "shrink-0 w-[70px] h-[70px] rounded-xl flex items-center justify-center text-4xl",
            "bg-cu-bg border border-cu-border/60",
            warnings.length > 0 && "mt-6"
          )}
        >
          {dish.imageEmoji ?? "🍽️"}
        </div>

        {/* Info */}
        <div className={cn("flex-1 min-w-0", warnings.length > 0 && "mt-6")}>
          {/* Name row */}
          <div className="flex items-start gap-2 mb-1">
            <VegDot isVeg={dish.isVeg} isVegan={dish.isVegan} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-cu-text text-sm leading-snug">{dish.name}</span>
                {dish.isChefPick && (
                  <span className="flex items-center gap-0.5 rounded-full bg-cu-maroon/10 text-cu-maroon px-1.5 py-0.5 text-[10px] font-bold">
                    <ChefHat size={8} /> Pick
                  </span>
                )}
                {dish.isPopular && (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold">
                    🔥 Popular
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-cu-muted leading-relaxed line-clamp-2 mb-2">
            {dish.description}
          </p>

          {/* Allergen badges */}
          {dish.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {dish.allergens.map((a) => (
                <span
                  key={a}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    warnings.includes(a)
                      ? "bg-red-100 text-red-600"
                      : "bg-cu-bg text-cu-muted border border-cu-border"
                  )}
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-display font-bold text-cu-accent">
                {formatCurrency(dish.price)}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-cu-muted">
                <Clock size={10} />
                {dish.prepTime}m
              </span>
              <SpiceDots level={dish.spiceLevel} />
            </div>

            {/* Add button */}
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(dish); }}
              className={cn(
                "flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all active:scale-95",
                inCart
                  ? "bg-cu-accent/10 text-cu-accent"
                  : "bg-cu-accent text-white hover:bg-cu-accent/90"
              )}
            >
              {inCart ? (
                <>
                  <span className="text-xs font-bold">{inCart.quantity}×</span>
                  <Plus size={13} />
                </>
              ) : (
                <>Add <Plus size={13} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sticky Cart Bar
// ---------------------------------------------------------------------------

function CartBar({ tableId, slug }: { tableId: string; slug: string }) {
  const router    = useRouter();
  const itemCount = useCartStore(selectItemCount);
  const subtotal  = useCartStore(selectSubtotal);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-4 pb-1">
      <button
        onClick={() => router.push(`/table/${tableId}/cart?restaurant=${slug}`)}
        className={cn(
          "w-full flex items-center justify-between",
          "rounded-2xl bg-cu-accent px-4 py-3.5 shadow-lg shadow-cu-accent/30",
          "text-white font-semibold hover:bg-cu-accent/90 active:scale-[0.98] transition-all"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">
            {itemCount}
          </span>
          <span className="text-sm">
            {itemCount} item{itemCount > 1 ? "s" : ""} in cart
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          {formatCurrency(subtotal)}
          <ChevronRight size={16} />
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CustomerMenuPage() {
  const params       = useParams<{ tableId: string }>();
  const searchParams = useSearchParams();
  const slug         = searchParams.get("restaurant") ?? "";
  const { restaurant, waiter } = useCustomer();
  const dietaryPrefs = useCartStore((s) => s.dietaryPrefs);

  const [dishes,       setDishes]       = useState<Dish[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("__all__");
  const [vegOnly,      setVegOnly]      = useState(false);
  const [addingDish,   setAddingDish]   = useState<Dish | null>(null);  // bottom sheet: add
  const [detailDish,   setDetailDish]   = useState<Dish | null>(null);  // bottom sheet: detail
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch menu
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/menu?restaurantSlug=${encodeURIComponent(slug)}&available=true`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load menu.");
        return res.json() as Promise<Dish[]>;
      })
      .then((data) => {
        setDishes(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, [slug]);

  // Build category tabs: All → Popular → actual categories sorted
  const categories = useMemo(() => {
    const map = new Map<string, Category>();
    for (const d of dishes) {
      if (!map.has(d.category.id)) map.set(d.category.id, d.category);
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [dishes]);

  const hasPopular = dishes.some((d) => d.isPopular);

  // Filter dishes
  const filtered = useMemo(() => {
    let result = dishes;

    if (activeCategory === "__popular__") {
      result = result.filter((d) => d.isPopular);
    } else if (activeCategory !== "__all__") {
      result = result.filter((d) => d.category.id === activeCategory);
    }

    if (vegOnly) {
      result = result.filter((d) => d.isVeg || d.isVegan);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.category.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [dishes, activeCategory, vegOnly, search]);

  // Related dishes for detail view (upsell ids, same category)
  const relatedDishes = useMemo(() => {
    if (!detailDish) return [];
    const byId = new Map(dishes.map((d) => [d.id, d]));
    return detailDish.upsellIds
      .map((id) => byId.get(id))
      .filter((d): d is Dish => !!d && d.id !== detailDish.id)
      .slice(0, 3);
  }, [detailDish, dishes]);

  const handleOpenAdd = useCallback((dish: Dish) => {
    setDetailDish(null);
    setAddingDish(dish);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cu-accent border-t-transparent animate-spin" />
        <p className="text-sm text-cu-muted">Loading menu…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
        <p className="text-4xl mb-3">😕</p>
        <p className="font-semibold text-cu-text">Couldn&apos;t load menu</p>
        <p className="text-sm text-cu-muted mt-1">{fetchError}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ── Top sticky header ─────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-cu-bg/95 backdrop-blur-md border-b border-cu-border/60">
          {/* Restaurant name bar */}
          {restaurant && (
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h1 className="font-display text-lg font-bold text-cu-text leading-none">
                {restaurant.name}
              </h1>
              <button
                onClick={() => setVegOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all",
                  vegOnly
                    ? "bg-cu-green text-white border-cu-green"
                    : "bg-cu-surface border-cu-border text-cu-muted hover:border-cu-green/50"
                )}
              >
                <Leaf size={12} />
                Veg Only
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cu-muted/60" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes…"
                className="w-full rounded-2xl border border-cu-border bg-cu-surface py-2.5 pl-9 pr-10 text-sm text-cu-text placeholder:text-cu-muted/60 focus:border-cu-accent focus:outline-none focus:ring-2 focus:ring-cu-accent/15"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cu-muted/60 hover:text-cu-muted"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {/* All tab */}
            {(
              [
                { id: "__all__",     label: "All" },
                ...(hasPopular ? [{ id: "__popular__", label: "⭐ Popular" }] : []),
                ...categories.map((c) => ({ id: c.id, label: c.name })),
              ] as { id: string; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                  activeCategory === tab.id
                    ? "bg-cu-accent text-white shadow-sm"
                    : "bg-cu-surface border border-cu-border text-cu-muted hover:border-cu-accent/40 hover:text-cu-text"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dietary warning banner ─────────────────────────────── */}
        {dietaryPrefs.length > 0 && (
          <div className="mx-4 mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Your dietary prefs: </span>
              {dietaryPrefs.join(", ")} — dishes with matching allergens are flagged.
            </p>
          </div>
        )}

        {/* ── Dish list ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-36">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold text-cu-text">Nothing found</p>
              <p className="text-sm text-cu-muted mt-1">
                {search ? `No dishes match "${search}"` : "No dishes in this category"}
              </p>
              {(search || vegOnly) && (
                <button
                  onClick={() => { setSearch(""); setVegOnly(false); setActiveCategory("__all__"); }}
                  className="mt-4 rounded-xl border border-cu-border px-4 py-2 text-sm text-cu-muted hover:text-cu-text"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                dietaryPrefs={dietaryPrefs}
                onTap={setDetailDish}
                onAdd={handleOpenAdd}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Sticky cart bar ───────────────────────────────────── */}
      <CartBar tableId={params.tableId} slug={slug} />

      {/* ── Add-to-cart sheet ─────────────────────────────────── */}
      {addingDish && (
        <AddToCartSheet
          dish={addingDish}
          onClose={() => setAddingDish(null)}
        />
      )}

      {/* ── Dish detail sheet ─────────────────────────────────── */}
      {detailDish && (
        <DishDetailSheet
          dish={detailDish}
          waiterName={waiter?.name ?? "your waiter"}
          waiterAvatar={waiter?.avatar ?? "👨‍🍳"}
          relatedDishes={relatedDishes}
          dietaryPrefs={dietaryPrefs}
          onClose={() => setDetailDish(null)}
          onAddToCart={handleOpenAdd}
        />
      )}
    </>
  );
}
