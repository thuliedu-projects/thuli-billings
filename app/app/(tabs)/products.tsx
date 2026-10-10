import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EmptyState,
  ListItemEnter,
  PressableScale,
  ShakeView,
  useToast,
} from '@/components/motion';
import { PrimaryButton } from '@/features/auth';
import { SegmentedTabs } from '@/features/billing';
import { formatInr, productUnitPrice, useDemo, type DemoProduct } from '@/features/demo';
import { loadBillingPreferences } from '@/features/settings';
import { theme } from '@/lib/theme';

type ProductsPane = 'products' | 'categories';

const PANE_TABS = [
  { value: 'products' as const, label: 'Products' },
  { value: 'categories' as const, label: 'Categories' },
];

const CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'grid-outline',
  'cafe-outline',
  'fast-food-outline',
  'nutrition-outline',
  'sparkles-outline',
  'home-outline',
  'shirt-outline',
  'basket-outline',
];

function categoryIconFor(name: string): keyof typeof Ionicons.glyphMap {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 97;
  return CATEGORY_ICONS[hash % CATEGORY_ICONS.length];
}

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    renameCategory,
    removeCategory,
    seedSampleProducts,
  } = useDemo();
  const [pane, setPane] = useState<ProductsPane>('products');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DemoProduct | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [categoryShake, setCategoryShake] = useState(0);
  const [openCategoryFromProduct, setOpenCategoryFromProduct] = useState(false);

  const [name, setName] = useState('');
  const [selling, setSelling] = useState('');
  const [cost, setCost] = useState('');
  const [discount, setDiscount] = useState('');
  const [gst, setGst] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState<keyof typeof Ionicons.glyphMap>('grid-outline');
  const [categoryError, setCategoryError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [products, query]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, query]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const key = product.category;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  function resetProductForm() {
    setName('');
    setSelling('');
    setCost('');
    setDiscount('');
    setGst('');
    setQty('');
    setUnit('');
    setCategory('');
    setEditingProduct(null);
    setSaveSuccess(false);
  }

  function openProductSheet() {
    resetProductForm();
    void (async () => {
      const prefs = await loadBillingPreferences();
      setGst(prefs.defaultGstPercent ? String(prefs.defaultGstPercent) : '');
    })();
    setProductSheetOpen(true);
  }

  function openEditProduct(product: DemoProduct) {
    setEditingProduct(product);
    setName(product.name);
    setSelling(String(product.sellingPrice));
    setCost(String(product.costPrice));
    setDiscount(product.discountPercent ? String(product.discountPercent) : '');
    setGst(product.gstPercent ? String(product.gstPercent) : '');
    setQty(String(product.stock));
    setUnit(product.unit);
    setCategory(product.category);
    setSaveSuccess(false);
    setProductSheetOpen(true);
  }

  function confirmDeleteProduct(product: DemoProduct) {
    Alert.alert(`Delete ${product.name}?`, 'This product will be removed from your catalog.', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProduct(product.id);
          showToast({ message: 'Product deleted', tone: 'success' });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function showProductActions(product: DemoProduct) {
    Alert.alert(product.name, 'Choose an action', [
      { text: 'Edit product', onPress: () => openEditProduct(product) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeleteProduct(product),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function resetCategoryForm() {
    setCategoryName('');
    setCategoryError('');
    setCategoryShake(0);
    setCategoryIcon('grid-outline');
    setEditingCategory(null);
    setOpenCategoryFromProduct(false);
  }

  function openCategorySheet(fromProduct = false) {
    resetCategoryForm();
    setOpenCategoryFromProduct(fromProduct);
    setCategorySheetOpen(true);
  }

  function openEditCategory(nameValue: string) {
    setEditingCategory(nameValue);
    setCategoryName(nameValue);
    setCategoryIcon(categoryIconFor(nameValue));
    setCategoryError('');
    setCategoryShake(0);
    setOpenCategoryFromProduct(false);
    setCategorySheetOpen(true);
  }

  function showCategoryActions(nameValue: string) {
    Alert.alert(nameValue, 'Choose an action', [
      { text: 'Edit category', onPress: () => openEditCategory(nameValue) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeleteCategory(nameValue),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmDeleteCategory(nameValue: string) {
    const count = categoryCounts.get(nameValue) ?? 0;
    const body =
      count > 0
        ? `${count} product${count === 1 ? '' : 's'} will keep this category until you change them.`
        : 'This category will be removed from the list.';
    Alert.alert(`Delete ${nameValue}?`, body, [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeCategory(nameValue);
          showToast({ message: 'Category deleted', tone: 'success' });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function saveProduct() {
    if (!name.trim()) {
      showToast({ message: 'Enter a product name', tone: 'error' });
      return;
    }
    if (!category.trim()) {
      showToast({ message: 'Select a category', tone: 'error' });
      return;
    }
    const payload = {
      name: name.trim(),
      category: category.trim(),
      sellingPrice: Number(selling) || 0,
      costPrice: Number(cost) || 0,
      discountPercent: Number(discount) || 0,
      gstPercent: Number(gst) || 0,
      stock: Number(qty) || 0,
      unit: unit.trim() || 'Nos',
    };
    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
      showToast({ message: 'Product updated', tone: 'success' });
    } else {
      addProduct(payload);
      showToast({ message: 'Product saved', tone: 'success' });
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setProductSheetOpen(false);
      resetProductForm();
    }, 700);
  }

  const isEditing = Boolean(editingProduct);
  const isEditingCategory = Boolean(editingCategory);
  const editingCategoryCount = editingCategory ? categoryCounts.get(editingCategory) ?? 0 : 0;

  function saveCategory() {
    const trimmed = categoryName.trim();
    if (!trimmed) {
      setCategoryError('Enter a category name');
      setCategoryShake((n) => n + 1);
      return;
    }
    const ok = editingCategory
      ? renameCategory(editingCategory, trimmed)
      : addCategory(trimmed);
    if (!ok) {
      setCategoryError('Category already exists');
      setCategoryShake((n) => n + 1);
      return;
    }
    if (openCategoryFromProduct) {
      setCategory(trimmed);
      setProductSheetOpen(true);
    }
    showToast({
      message: editingCategory ? 'Category updated' : 'Category added',
      tone: 'success',
    });
    setCategorySheetOpen(false);
    resetCategoryForm();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} hitSlop={10} style={styles.headerBtn} scaleTo={0.9}>
          <Ionicons name="arrow-back" size={22} color={theme.purple} />
        </PressableScale>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Products</Text>
          <Text style={styles.subtitle}>Add, edit and organize your catalog</Text>
        </View>
        <PressableScale
          onPress={() => {
            seedSampleProducts();
            showToast({ message: 'Sample products imported', tone: 'success' });
          }}
          hitSlop={10}
          style={styles.importBtn}
          accessibilityLabel="Import sample products"
          scaleTo={0.94}
        >
          <Ionicons name="download-outline" size={18} color={theme.purple} />
          <Text style={styles.importLabel}>Import</Text>
        </PressableScale>
      </View>

      <View style={styles.paneTabs}>
        <SegmentedTabs options={PANE_TABS} value={pane} onChange={setPane} />
      </View>

      <View style={[styles.search, searchFocused && styles.searchFocused]}>
        <Ionicons name="search" size={18} color={theme.purple} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            pane === 'products'
              ? 'Search products by name or barcode'
              : 'Search categories'
          }
          placeholderTextColor={theme.textPlaceholder}
          style={styles.searchInput}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {pane === 'products' ? (
          <Ionicons name="barcode-outline" size={20} color={theme.purple} />
        ) : null}
      </View>

      {pane === 'products' ? (
        <>
          <View style={styles.actionCards}>
            <PressableScale style={styles.actionCard} onPress={openProductSheet} scaleTo={0.97}>
              <View style={styles.actionIcon}>
                <Ionicons name="create-outline" size={18} color={theme.purple} />
              </View>
              <Text style={styles.actionTitle}>Add Manually</Text>
              <Text style={styles.actionBody}>Add a new product manually</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.purple}
                style={styles.actionChevron}
              />
            </PressableScale>
            <PressableScale
              style={styles.actionCard}
              onPress={() => {
                seedSampleProducts();
                showToast({ message: 'Sample products imported', tone: 'success' });
              }}
              scaleTo={0.97}
            >
              <View style={[styles.actionIcon, styles.excelIcon]}>
                <Text style={styles.excelX}>X</Text>
              </View>
              <Text style={styles.actionTitle}>Import from Excel</Text>
              <Text style={styles.actionBody}>Bulk add products using Excel file</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.purple}
                style={styles.actionChevron}
              />
            </PressableScale>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Product List ({filtered.length})</Text>
            <PressableScale style={styles.sortBtn} scaleTo={0.95} hapticOnPress="selection">
              <Ionicons name="swap-vertical" size={16} color={theme.purple} />
              <Text style={styles.sortLabel}>Sort</Text>
            </PressableScale>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon="cube"
              title="No products added yet"
              body="Add your first product to get started"
              ctaLabel="Add Your First Product"
              onCta={openProductSheet}
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const unitPrice = productUnitPrice(item);
                return (
                  <ListItemEnter index={index}>
                    <PressableScale
                      style={styles.row}
                      scaleTo={0.985}
                      hapticOnPress="selection"
                      onPress={() => openEditProduct(item)}
                    >
                      <View style={styles.thumb}>
                        <Text style={styles.thumbEmoji}>{item.emoji}</Text>
                      </View>
                      <View style={styles.rowMain}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowCat}>{item.category}</Text>
                        {item.discountPercent > 0 ? (
                          <Text style={styles.rowDiscount}>{item.discountPercent}% off</Text>
                        ) : null}
                        {item.gstPercent > 0 ? (
                          <Text style={styles.rowGst}>GST {item.gstPercent}%</Text>
                        ) : null}
                      </View>
                      <View style={styles.rowMeta}>
                        <Text style={styles.rowPrice}>{formatInr(unitPrice)}</Text>
                        <Text style={styles.rowMetaLabel}>
                          {item.discountPercent > 0 ? 'After discount' : 'Selling Price'}
                        </Text>
                      </View>
                      <View style={styles.rowMeta}>
                        <Text style={styles.rowStock}>{item.stock}</Text>
                        <Text style={styles.rowMetaLabel}>In Stock</Text>
                      </View>
                      <PressableScale
                        hitSlop={8}
                        onPress={() => openEditProduct(item)}
                        style={styles.editBtn}
                        scaleTo={0.9}
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Ionicons name="create-outline" size={16} color={theme.purple} />
                      </PressableScale>
                      <Pressable
                        hitSlop={8}
                        onPress={() => showProductActions(item)}
                        style={styles.moreBtn}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
                      </Pressable>
                    </PressableScale>
                  </ListItemEnter>
                );
              }}
            />
          )}

          <PressableScale
            style={[styles.fab, { bottom: 16 }]}
            onPress={openProductSheet}
            scaleTo={0.92}
            hapticOnPress="medium"
          >
            <Ionicons name="add" size={28} color={theme.white} />
          </PressableScale>
        </>
      ) : (
        <>
          <PressableScale style={styles.categoryAddCard} onPress={() => openCategorySheet()} scaleTo={0.98}>
            <View style={[styles.actionIcon, styles.categoryAddIcon]}>
              <Ionicons name="grid-outline" size={18} color={theme.purple} />
            </View>
            <View style={styles.categoryAddCopy}>
              <Text style={styles.actionTitle}>Add Category</Text>
              <Text style={styles.actionBody}>Create a category for your products</Text>
            </View>
            <Ionicons name="add-circle" size={22} color={theme.purple} />
          </PressableScale>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Categories ({filteredCategories.length})</Text>
          </View>

          {filteredCategories.length === 0 ? (
            <EmptyState
              icon="grid"
              title="No categories yet"
              body="Add categories to organize products"
              ctaLabel="Add Category"
              onCta={() => openCategorySheet()}
            />
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <ListItemEnter index={index}>
                  <PressableScale
                    style={styles.categoryRow}
                    scaleTo={0.985}
                    hapticOnPress="selection"
                    onPress={() => openEditCategory(item)}
                  >
                    <View style={styles.categoryThumb}>
                      <Ionicons name={categoryIconFor(item)} size={18} color={theme.purple} />
                    </View>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{item}</Text>
                      <Text style={styles.rowCat}>
                        {categoryCounts.get(item) ?? 0} products
                      </Text>
                    </View>
                    <PressableScale
                      hitSlop={8}
                      onPress={() => openEditCategory(item)}
                      style={styles.editBtn}
                      scaleTo={0.9}
                    >
                      <Ionicons name="create-outline" size={16} color={theme.purple} />
                    </PressableScale>
                    <Pressable
                      hitSlop={8}
                      onPress={() => showCategoryActions(item)}
                      style={styles.moreBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
                    </Pressable>
                  </PressableScale>
                </ListItemEnter>
              )}
            />
          )}

          <PressableScale
            style={[styles.fab, { bottom: 16 }]}
            onPress={() => openCategorySheet()}
            scaleTo={0.92}
            hapticOnPress="medium"
          >
            <Ionicons name="add" size={28} color={theme.white} />
          </PressableScale>
        </>
      )}

      <Modal
        visible={productSheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setProductSheetOpen(false);
          resetProductForm();
        }}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={styles.sheetDismiss}
            onPress={() => {
              setProductSheetOpen(false);
              resetProductForm();
            }}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
              <Pressable
                onPress={() => {
                  setProductSheetOpen(false);
                  resetProductForm();
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color={theme.purpleDark} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field
                label="Product Name"
                required
                icon="pricetag-outline"
                placeholder="Enter product name"
                value={name}
                onChangeText={setName}
              />
              <View style={styles.priceRow}>
                <View style={styles.priceCol}>
                  <Field
                    label="Selling Price (₹)"
                    required
                    prefix="₹"
                    placeholder="0.00"
                    value={selling}
                    onChangeText={setSelling}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.priceCol}>
                  <Field
                    label="Cost Price (₹)"
                    prefix="₹"
                    placeholder="0.00"
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Field
                label="Discount (%)"
                icon="pricetag-outline"
                placeholder="0"
                value={discount}
                onChangeText={(text) => setDiscount(text.replace(/[^0-9.]/g, '').slice(0, 5))}
                keyboardType="decimal-pad"
              />
              <Field
                label="GST (%)"
                icon="receipt-outline"
                placeholder="0 / 5 / 12 / 18 / 28"
                value={gst}
                onChangeText={(text) => setGst(text.replace(/[^0-9.]/g, '').slice(0, 5))}
                keyboardType="decimal-pad"
              />
              <Text style={styles.gstHint}>
                Owner sets GST per product — rates are not fixed for the whole store.
              </Text>
              <Field
                label="Stock Quantity"
                required
                icon="cube-outline"
                placeholder="Enter quantity"
                value={qty}
                onChangeText={setQty}
                keyboardType="number-pad"
              />
              <Field
                label="Unit"
                icon="bag-handle-outline"
                placeholder="e.g. Nos, Kg, L"
                value={unit}
                onChangeText={setUnit}
              />

              <Text style={styles.fieldLabel}>
                Category
                <Text style={styles.req}> *</Text>
              </Text>
              <PressableScale
                style={[styles.dropdown, !category && styles.dropdownEmpty]}
                onPress={() => setCategoryPickerOpen(true)}
                scaleTo={0.99}
              >
                <Ionicons
                  name={category ? categoryIconFor(category) : 'grid-outline'}
                  size={16}
                  color={theme.purple}
                />
                <Text
                  style={[styles.dropdownValue, !category && styles.dropdownPlaceholder]}
                  numberOfLines={1}
                >
                  {category || 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
              </PressableScale>

              <PrimaryButton
                label={isEditing ? 'Update Product' : 'Save Product'}
                onPress={saveProduct}
                success={saveSuccess}
                style={styles.saveBtn}
              />
              <View style={styles.secureRow}>
                <Ionicons name="lock-closed" size={12} color={theme.purple} />
                <Text style={styles.secureText}>
                  Your data is secure and only used to improve your experience.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={categoryPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable style={styles.sheetDismiss} onPress={() => setCategoryPickerOpen(false)} />
          <View style={[styles.pickerCard, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select category</Text>
              <Pressable onPress={() => setCategoryPickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={theme.purpleDark} />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const active = category === cat;
                return (
                  <PressableScale
                    key={cat}
                    style={[styles.pickerRow, active && styles.pickerRowActive]}
                    onPress={() => {
                      setCategory(cat);
                      setCategoryPickerOpen(false);
                    }}
                    scaleTo={0.98}
                  >
                    <View style={styles.pickerIcon}>
                      <Ionicons name={categoryIconFor(cat)} size={16} color={theme.purple} />
                    </View>
                    <Text style={[styles.pickerLabel, active && styles.pickerLabelActive]}>
                      {cat}
                    </Text>
                    {active ? <Ionicons name="checkmark-circle" size={18} color={theme.purple} /> : null}
                  </PressableScale>
                );
              })}
            </ScrollView>
            <PressableScale
              style={styles.pickerAdd}
              onPress={() => {
                setCategoryPickerOpen(false);
                setProductSheetOpen(false);
                openCategorySheet(true);
              }}
              scaleTo={0.98}
            >
              <Ionicons name="add-circle" size={18} color={theme.purple} />
              <Text style={styles.pickerAddLabel}>Create new category</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

      <Modal
        visible={categorySheetOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setCategorySheetOpen(false);
          resetCategoryForm();
        }}
      >
        <View style={styles.categoryModalBackdrop}>
          <Pressable
            style={styles.sheetDismiss}
            onPress={() => {
              setCategorySheetOpen(false);
              resetCategoryForm();
            }}
          />
          <View style={[styles.categoryCard, { marginBottom: insets.bottom + 24 }]}>
            <View style={styles.categoryHero}>
              <View style={styles.categoryHeroGlow} />
              <View style={styles.categoryHeroIcon}>
                <Ionicons name={categoryIcon} size={28} color={theme.purple} />
              </View>
              <Text style={styles.categoryHeroTitle}>
                {isEditingCategory ? 'Edit category' : 'New category'}
              </Text>
              <Text style={styles.categoryHeroBody}>
                {isEditingCategory
                  ? `${editingCategoryCount} product${editingCategoryCount === 1 ? '' : 's'} in this group`
                  : 'Organize products for faster billing'}
              </Text>
              <Pressable
                onPress={() => {
                  setCategorySheetOpen(false);
                  resetCategoryForm();
                }}
                style={styles.categoryClose}
              >
                <Ionicons name="close" size={18} color={theme.purpleDark} />
              </Pressable>
            </View>

            <View style={styles.categoryBody}>
              <Text style={styles.categorySectionLabel}>Pick an icon</Text>
              <View style={styles.iconGrid}>
                {CATEGORY_ICONS.map((icon) => {
                  const active = categoryIcon === icon;
                  return (
                    <PressableScale
                      key={icon}
                      style={[styles.iconChip, active && styles.iconChipActive]}
                      onPress={() => setCategoryIcon(icon)}
                      scaleTo={0.92}
                    >
                      <Ionicons
                        name={icon}
                        size={18}
                        color={active ? theme.white : theme.purple}
                      />
                    </PressableScale>
                  );
                })}
              </View>

              <ShakeView trigger={categoryShake}>
                <Field
                  label="Category Name"
                  required
                  icon="grid-outline"
                  placeholder="e.g. Household, Snacks"
                  value={categoryName}
                  onChangeText={(text) => {
                    setCategoryName(text);
                    if (categoryError) setCategoryError('');
                  }}
                  error={Boolean(categoryError)}
                />
              </ShakeView>
              {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}

              <PrimaryButton
                label={isEditingCategory ? 'Update Category' : 'Save Category'}
                onPress={saveCategory}
                style={styles.saveBtn}
              />

              {isEditingCategory ? (
                <PressableScale
                  style={styles.deleteCategoryBtn}
                  onPress={() => {
                    const target = editingCategory;
                    setCategorySheetOpen(false);
                    resetCategoryForm();
                    if (target) confirmDeleteCategory(target);
                  }}
                  scaleTo={0.98}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  <Text style={styles.deleteCategoryLabel}>Delete category</Text>
                </PressableScale>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: keyof typeof Ionicons.glyphMap;
  prefix?: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  error?: boolean;
};

function Field({
  label,
  required,
  icon,
  trailing,
  prefix,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  error,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.fieldBox,
          focused && styles.fieldBoxFocused,
          error && styles.fieldBoxError,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={16} color={error ? theme.danger : theme.purple} />
        ) : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textPlaceholder}
          style={styles.fieldInput}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {trailing ? <Ionicons name={trailing} size={16} color={theme.textSecondary} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: theme.purple,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  importBtn: {
    alignItems: 'center',
    minWidth: 44,
  },
  importLabel: {
    color: theme.purple,
    fontSize: 11,
    fontWeight: '600',
  },
  paneTabs: {
    marginBottom: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    marginBottom: 12,
    backgroundColor: theme.white,
  },
  searchFocused: {
    borderColor: theme.borderFocus,
    backgroundColor: theme.purpleSoft,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    paddingVertical: 10,
  },
  actionCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.purpleBorder,
    borderRadius: 14,
    padding: 12,
    backgroundColor: theme.white,
    minHeight: 110,
  },
  categoryAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.purpleBorder,
    borderRadius: 14,
    padding: 12,
    backgroundColor: theme.white,
    marginBottom: 16,
  },
  categoryAddCopy: {
    flex: 1,
  },
  categoryAddIcon: {
    marginBottom: 0,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  excelIcon: {
    backgroundColor: '#E8F5E9',
  },
  excelX: {
    color: '#2E7D32',
    fontWeight: '800',
    fontSize: 14,
  },
  actionTitle: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBody: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    paddingRight: 12,
  },
  actionChevron: {
    position: 'absolute',
    right: 10,
    top: 14,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '700',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: theme.white,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.white,
  },
  categoryThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 22,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  rowCat: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  rowDiscount: {
    marginTop: 2,
    color: theme.success,
    fontSize: 10,
    fontWeight: '700',
  },
  rowGst: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  rowMeta: {
    alignItems: 'flex-end',
    minWidth: 54,
  },
  rowPrice: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  rowStock: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  rowMetaLabel: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 10,
  },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,48,0.35)',
    justifyContent: 'flex-end',
  },
  sheetDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    color: theme.purpleDark,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 6,
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  req: {
    color: theme.purple,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    backgroundColor: theme.white,
  },
  fieldBoxFocused: {
    borderColor: theme.borderFocus,
    backgroundColor: theme.purpleSoft,
  },
  fieldBoxError: {
    borderColor: theme.danger,
  },
  prefix: {
    color: theme.purple,
    fontWeight: '700',
  },
  fieldInput: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    paddingVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceCol: {
    flex: 1,
  },
  gstHint: {
    marginTop: -6,
    marginBottom: 12,
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    backgroundColor: theme.white,
    marginBottom: 12,
  },
  dropdownEmpty: {
    borderStyle: 'dashed',
    borderColor: theme.purpleBorder,
  },
  dropdownValue: {
    flex: 1,
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownPlaceholder: {
    color: theme.textPlaceholder,
    fontWeight: '500',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,48,0.4)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerTitle: {
    color: theme.purpleDark,
    fontSize: 17,
    fontWeight: '800',
  },
  pickerList: {
    maxHeight: 280,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerRowActive: {
    backgroundColor: theme.purpleSoft,
  },
  pickerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    flex: 1,
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerLabelActive: {
    color: theme.purple,
  },
  pickerAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.purpleBorder,
    borderStyle: 'dashed',
    backgroundColor: theme.purpleSoft,
  },
  pickerAddLabel: {
    color: theme.purple,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,48,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  categoryCard: {
    backgroundColor: theme.white,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: theme.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  categoryHero: {
    backgroundColor: theme.purpleSoft,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  categoryHeroGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.purpleWave,
    opacity: 0.55,
  },
  categoryHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.purpleBorder,
  },
  categoryHeroTitle: {
    color: theme.purpleDark,
    fontSize: 20,
    fontWeight: '800',
  },
  categoryHeroBody: {
    marginTop: 6,
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  categoryClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBody: {
    padding: 18,
  },
  categorySectionLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: theme.purple,
  },
  errorText: {
    marginTop: -6,
    marginBottom: 8,
    color: theme.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 8,
  },
  deleteCategoryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteCategoryLabel: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  secureText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
});
