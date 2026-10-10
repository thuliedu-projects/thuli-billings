import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  deleteLocalStore,
  deleteRemoteAccount,
  deleteRemoteStore,
  getActiveStoreId,
  listLocalStores,
  persistLocalStore,
  setActiveStoreId as persistActiveStoreId,
  wipeLocalAccount,
} from '@/db';

import {
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
  SAMPLE_STORE_ID,
  SAMPLE_STORES,
  clampDiscountPercent,
  clampGstPercent,
  type CartLine,
  type DemoProduct,
  type DemoStore,
} from './data';

function persistQuiet(task: Promise<unknown>) {
  void task.catch(() => undefined);
}

type StoreInput = {
  name: string;
  location?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  logoUri?: string;
};

type DemoContextValue = {
  stores: DemoStore[];
  activeStoreId: string;
  activeStore: DemoStore;
  storeName: string;
  storeLocation: string;
  storePhone: string;
  products: DemoProduct[];
  categories: string[];
  cart: CartLine[];
  billDiscount: number;
  setActiveStore: (id: string) => void;
  addStore: (details: StoreInput) => string;
  updateStore: (id: string, details: Partial<Omit<DemoStore, 'id'>>) => void;
  removeStore: (id: string) => Promise<boolean>;
  deleteAccount: () => Promise<void>;
  setStoreDetails: (details: {
    name?: string;
    location?: string;
    phone?: string;
    address?: string;
    gstin?: string;
    logoUri?: string;
  }) => void;
  addProduct: (
    product: Omit<DemoProduct, 'id' | 'emoji' | 'storeId' | 'discountPercent' | 'gstPercent'> & {
      emoji?: string;
      discountPercent?: number;
      gstPercent?: number;
      storeId?: string;
    },
  ) => void;
  updateProduct: (
    id: string,
    product: Partial<Omit<DemoProduct, 'id' | 'storeId'>> & { name?: string },
  ) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => boolean;
  renameCategory: (from: string, to: string) => boolean;
  removeCategory: (name: string) => void;
  seedSampleProducts: () => void;
  addToCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setBillDiscount: (amount: number) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function emptyCategoriesByStore(storeIds: string[]) {
  const map: Record<string, string[]> = {};
  for (const id of storeIds) {
    map[id] = [...SAMPLE_CATEGORIES];
  }
  return map;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<DemoStore[]>(SAMPLE_STORES);
  const [activeStoreId, setActiveStoreId] = useState(SAMPLE_STORE_ID);
  const [allProducts, setAllProducts] = useState<DemoProduct[]>([]);
  const [categoriesByStore, setCategoriesByStore] = useState<Record<string, string[]>>(() =>
    emptyCategoriesByStore(SAMPLE_STORES.map((s) => s.id)),
  );
  const [cartByStore, setCartByStore] = useState<Record<string, CartLine[]>>({
    [SAMPLE_STORE_ID]: [],
  });
  const [billDiscountByStore, setBillDiscountByStore] = useState<Record<string, number>>({
    [SAMPLE_STORE_ID]: 0,
  });

  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId) ?? stores[0] ?? SAMPLE_STORES[0],
    [stores, activeStoreId],
  );

  const products = useMemo(
    () => allProducts.filter((p) => p.storeId === activeStore.id),
    [allProducts, activeStore.id],
  );

  const categories = useMemo(
    () => categoriesByStore[activeStore.id] ?? [],
    [categoriesByStore, activeStore.id],
  );

  const cart = useMemo(
    () => cartByStore[activeStore.id] ?? [],
    [cartByStore, activeStore.id],
  );

  const billDiscount = billDiscountByStore[activeStore.id] ?? 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await listLocalStores();
        if (cancelled) return;
        if (loaded.length === 0) {
          for (const store of SAMPLE_STORES) {
            await persistLocalStore(store);
          }
          await persistActiveStoreId(SAMPLE_STORE_ID);
          return;
        }
        setStores(loaded);
        const savedId = await getActiveStoreId();
        const nextId =
          savedId && loaded.some((store) => store.id === savedId)
            ? savedId
            : loaded[0].id;
        setActiveStoreId(nextId);
        for (const id of loaded.map((store) => store.id)) {
          setCategoriesByStore((prev) =>
            prev[id] ? prev : { ...prev, [id]: [...SAMPLE_CATEGORIES] },
          );
          setCartByStore((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
          setBillDiscountByStore((prev) =>
            prev[id] !== undefined ? prev : { ...prev, [id]: 0 },
          );
        }
      } catch {
        // Keep in-memory sample stores if SQLite is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveStore = useCallback((id: string) => {
    setActiveStoreId(id);
    persistQuiet(persistActiveStoreId(id));
  }, []);

  const addStore = useCallback((details: StoreInput) => {
    const id = `store-${Date.now()}`;
    const store: DemoStore = {
      id,
      name: details.name.trim() || 'New Store',
      location: details.location?.trim() ?? '',
      phone: details.phone?.trim() ?? '',
      address: details.address?.trim() ?? '',
      gstin: details.gstin?.trim() ?? '',
      logoUri: details.logoUri?.trim() ?? '',
    };
    setStores((prev) => [...prev, store]);
    setCategoriesByStore((prev) => ({ ...prev, [id]: [...SAMPLE_CATEGORIES] }));
    setCartByStore((prev) => ({ ...prev, [id]: [] }));
    setBillDiscountByStore((prev) => ({ ...prev, [id]: 0 }));
    setActiveStoreId(id);
    persistQuiet(persistLocalStore(store));
    persistQuiet(persistActiveStoreId(id));
    return id;
  }, []);

  const updateStore = useCallback((id: string, details: Partial<Omit<DemoStore, 'id'>>) => {
    setStores((prev) => {
      const next = prev.map((store) => {
        if (store.id !== id) return store;
        return {
          ...store,
          name: details.name?.trim() || store.name,
          location: details.location !== undefined ? details.location.trim() : store.location,
          phone: details.phone !== undefined ? details.phone.trim() : store.phone,
          address: details.address !== undefined ? details.address.trim() : store.address,
          gstin: details.gstin !== undefined ? details.gstin.trim() : store.gstin,
          logoUri: details.logoUri !== undefined ? details.logoUri.trim() : store.logoUri,
        };
      });
      const updated = next.find((store) => store.id === id);
      if (updated) persistQuiet(persistLocalStore(updated));
      return next;
    });
  }, []);

  const removeStore = useCallback(
    async (id: string) => {
      if (stores.length <= 1) return false;
      await deleteRemoteStore(id);
      await deleteLocalStore(id);
      const fallback = stores.find((s) => s.id !== id);
      setStores((prev) => prev.filter((s) => s.id !== id));
      setAllProducts((prev) => prev.filter((p) => p.storeId !== id));
      setCategoriesByStore((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCartByStore((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setBillDiscountByStore((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeStoreId === id && fallback) {
        setActiveStoreId(fallback.id);
        persistQuiet(persistActiveStoreId(fallback.id));
      }
      return true;
    },
    [stores, activeStoreId],
  );

  const deleteAccount = useCallback(async () => {
    await deleteRemoteAccount();
    await wipeLocalAccount();
    setStores([]);
    setAllProducts([]);
    setCategoriesByStore({});
    setCartByStore({});
    setBillDiscountByStore({});
    setActiveStoreId('');
  }, []);

  const setStoreDetails = useCallback(
    (details: {
      name?: string;
      location?: string;
      phone?: string;
      address?: string;
      gstin?: string;
      logoUri?: string;
    }) => {
      if (stores.length === 0) {
        addStore({
          name: details.name?.trim() || 'New Store',
          location: details.location,
          phone: details.phone,
          address: details.address,
          gstin: details.gstin,
          logoUri: details.logoUri,
        });
        return;
      }
      updateStore(activeStoreId, details);
    },
    [activeStoreId, addStore, stores.length, updateStore],
  );

  const addProduct = useCallback(
    (
      product: Omit<DemoProduct, 'id' | 'emoji' | 'storeId' | 'discountPercent' | 'gstPercent'> & {
        emoji?: string;
        discountPercent?: number;
        gstPercent?: number;
        storeId?: string;
      },
    ) => {
      const storeId = product.storeId ?? activeStoreId;
      setAllProducts((prev) => [
        {
          id: `p-${Date.now()}`,
          emoji: product.emoji ?? '📦',
          storeId,
          name: product.name,
          category: product.category,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          discountPercent: clampDiscountPercent(product.discountPercent ?? 0),
          gstPercent: clampGstPercent(product.gstPercent ?? 0),
          stock: product.stock,
          unit: product.unit,
        },
        ...prev,
      ]);
      const cat = product.category.trim();
      if (cat) {
        setCategoriesByStore((prev) => {
          const list = prev[storeId] ?? [];
          if (list.some((c) => c.toLowerCase() === cat.toLowerCase())) return prev;
          return { ...prev, [storeId]: [...list, cat] };
        });
      }
    },
    [activeStoreId],
  );

  const updateProduct = useCallback(
    (id: string, product: Partial<Omit<DemoProduct, 'id' | 'storeId'>> & { name?: string }) => {
      let productStoreId = activeStoreId;
      setAllProducts((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          productStoreId = item.storeId;
          return {
            ...item,
            ...product,
            name: product.name?.trim() || item.name,
            category: product.category?.trim() || item.category,
            unit: product.unit?.trim() || item.unit,
            discountPercent:
              product.discountPercent !== undefined
                ? clampDiscountPercent(product.discountPercent)
                : item.discountPercent,
            gstPercent:
              product.gstPercent !== undefined
                ? clampGstPercent(product.gstPercent)
                : item.gstPercent,
          };
        }),
      );
      const cat = product.category?.trim();
      if (cat) {
        setCategoriesByStore((prev) => {
          const list = prev[productStoreId] ?? [];
          if (list.some((c) => c.toLowerCase() === cat.toLowerCase())) return prev;
          return { ...prev, [productStoreId]: [...list, cat] };
        });
      }
    },
    [activeStoreId],
  );

  const deleteProduct = useCallback((id: string) => {
    setAllProducts((prev) => prev.filter((p) => p.id !== id));
    setCartByStore((prev) => {
      const next: Record<string, CartLine[]> = {};
      for (const [storeId, lines] of Object.entries(prev)) {
        next[storeId] = lines.filter((line) => line.productId !== id);
      }
      return next;
    });
  }, []);

  const addCategory = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      let added = false;
      setCategoriesByStore((prev) => {
        const list = prev[activeStoreId] ?? [];
        if (list.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return prev;
        added = true;
        return { ...prev, [activeStoreId]: [...list, trimmed] };
      });
      return added;
    },
    [activeStoreId],
  );

  const renameCategory = useCallback(
    (from: string, to: string) => {
      const trimmed = to.trim();
      if (!trimmed) return false;
      let renamed = true;
      setCategoriesByStore((prev) => {
        const list = prev[activeStoreId] ?? [];
        const sameName = from.toLowerCase() === trimmed.toLowerCase();
        if (!sameName && list.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          renamed = false;
          return prev;
        }
        return {
          ...prev,
          [activeStoreId]: list.map((c) => (c === from ? trimmed : c)),
        };
      });
      if (!renamed) return false;
      if (from !== trimmed) {
        setAllProducts((prev) =>
          prev.map((item) =>
            item.storeId === activeStoreId && item.category === from
              ? { ...item, category: trimmed }
              : item,
          ),
        );
      }
      return true;
    },
    [activeStoreId],
  );

  const removeCategory = useCallback(
    (name: string) => {
      setCategoriesByStore((prev) => ({
        ...prev,
        [activeStoreId]: (prev[activeStoreId] ?? []).filter((c) => c !== name),
      }));
    },
    [activeStoreId],
  );

  const seedSampleProducts = useCallback(() => {
    const storeId = activeStoreId;
    setAllProducts((prev) => {
      const others = prev.filter((p) => p.storeId !== storeId);
      return [
        ...SAMPLE_PRODUCTS.map((p) => ({ ...p, storeId, id: `${storeId}-${p.id}` })),
        ...others,
      ];
    });
    setCategoriesByStore((prev) => {
      const next = [...(prev[storeId] ?? [])];
      for (const cat of SAMPLE_CATEGORIES) {
        if (!next.some((c) => c.toLowerCase() === cat.toLowerCase())) next.push(cat);
      }
      return { ...prev, [storeId]: next };
    });
  }, [activeStoreId]);

  const addToCart = useCallback(
    (productId: string) => {
      setCartByStore((prev) => {
        const lines = prev[activeStoreId] ?? [];
        const existing = lines.find((line) => line.productId === productId);
        const nextLines = existing
          ? lines.map((line) =>
              line.productId === productId
                ? { ...line, quantity: line.quantity + 1 }
                : line,
            )
          : [...lines, { productId, quantity: 1 }];
        return { ...prev, [activeStoreId]: nextLines };
      });
    },
    [activeStoreId],
  );

  const updateCartQty = useCallback(
    (productId: string, quantity: number) => {
      setCartByStore((prev) => {
        const lines = prev[activeStoreId] ?? [];
        const nextLines =
          quantity <= 0
            ? lines.filter((line) => line.productId !== productId)
            : lines.map((line) =>
                line.productId === productId ? { ...line, quantity } : line,
              );
        return { ...prev, [activeStoreId]: nextLines };
      });
    },
    [activeStoreId],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setCartByStore((prev) => ({
        ...prev,
        [activeStoreId]: (prev[activeStoreId] ?? []).filter(
          (line) => line.productId !== productId,
        ),
      }));
    },
    [activeStoreId],
  );

  const clearCart = useCallback(() => {
    setCartByStore((prev) => ({ ...prev, [activeStoreId]: [] }));
    setBillDiscountByStore((prev) => ({ ...prev, [activeStoreId]: 0 }));
  }, [activeStoreId]);

  const setBillDiscount = useCallback(
    (amount: number) => {
      const next = !Number.isFinite(amount) || amount < 0 ? 0 : amount;
      setBillDiscountByStore((prev) => ({ ...prev, [activeStoreId]: next }));
    },
    [activeStoreId],
  );

  const value = useMemo(
    () => ({
      stores,
      activeStoreId: activeStore.id,
      activeStore,
      storeName: activeStore.name,
      storeLocation: activeStore.location,
      storePhone: activeStore.phone,
      products,
      categories,
      cart,
      billDiscount,
      setActiveStore,
      addStore,
      updateStore,
      removeStore,
      deleteAccount,
      setStoreDetails,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      renameCategory,
      removeCategory,
      seedSampleProducts,
      addToCart,
      updateCartQty,
      removeFromCart,
      clearCart,
      setBillDiscount,
    }),
    [
      stores,
      activeStore,
      products,
      categories,
      cart,
      billDiscount,
      setActiveStore,
      addStore,
      updateStore,
      removeStore,
      deleteAccount,
      setStoreDetails,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      renameCategory,
      removeCategory,
      seedSampleProducts,
      addToCart,
      updateCartQty,
      removeFromCart,
      clearCart,
      setBillDiscount,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
