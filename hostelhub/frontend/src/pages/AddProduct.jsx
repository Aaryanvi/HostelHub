import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProduct, updateProduct, getProduct, deleteProduct,
  getCategories, getPriceSuggestion, uploadImage,
} from "../services/productService";
import { useToast } from "../context/ToastContext";
import "./AddProduct.css";

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Worn"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EMPTY_FORM = { title: "", description: "", price: "", category: "", condition: "Good", image: "" };

export default function AddProduct() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    let active = true;
    async function load() {
      try {
        const product = await getProduct(id);
        if (!active) return;
        setForm({
          title: product.title,
          description: product.description || "",
          price: String(product.price),
          category: product.category,
          condition: product.condition,
          image: product.image_path || "",
        });
        setImagePreview(product.image || "");
      } catch (err) {
        toast.error(err.message || "Unable to load this listing.");
        navigate("/profile");
      } finally {
        if (active) setLoadingProduct(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, isEditMode, navigate, toast]);

  // Price hint: look up similar listings once a category is chosen.
  useEffect(() => {
    if (!form.category) {
      setSuggestion(null);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await getPriceSuggestion(form.category, form.condition);
        if (active) setSuggestion(result);
      } catch (err) {
        if (active) setSuggestion(null);
      }
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [form.category, form.condition]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Choose an image file (JPG, PNG, GIF or WebP)." }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({ ...prev, image: "Image must be 5MB or smaller." }));
      return;
    }

    setErrors((prev) => ({ ...prev, image: undefined }));
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      update("image", uploaded.path);
      setImagePreview(uploaded.url);
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: err.message || "Image upload failed. Please try again." }));
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    update("image", "");
    setImagePreview("");
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    const priceNum = parseFloat(form.price);
    if (form.price === "" || isNaN(priceNum) || priceNum < 0) errs.price = "Enter a valid price.";
    if (!form.category) errs.category = "Select a category.";
    if (!form.condition) errs.condition = "Select a condition.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (uploading || !validate()) return;

    setSubmitting(true);
    const payload = { ...form, price: parseFloat(form.price) };

    try {
      if (isEditMode) {
        const updated = await updateProduct(id, payload);
        toast.success("Listing updated.");
        navigate(`/product/${updated.id}`);
      } else {
        const created = await createProduct(payload);
        toast.success("Item listed successfully.");
        navigate(`/product/${created.id}`);
      }
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
      if (err.fields) setErrors((prev) => ({ ...prev, ...err.fields }));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteProduct(id);
      toast.success("Listing deleted.");
      navigate("/profile");
    } catch (err) {
      toast.error(err.message || "Unable to delete this listing.");
    } finally {
      setDeleting(false);
    }
  }

  if (loadingProduct) {
    return (
      <div className="container add-product-page">
        <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  return (
    <div className="container add-product-page">
      <div className="add-product-card card">
        <h1>{isEditMode ? "Edit Listing" : "List an Item"}</h1>
        <p className="auth-sub">
          {isEditMode ? "Update your listing details below." : "Fill in the details to list your item on HostelHub."}
        </p>

        {formError && <div className="error-banner">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="title">Product title</label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className={errors.title ? "has-error" : ""}
              placeholder="e.g. Casio FX-991ES Calculator"
              maxLength={150}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Condition details, why you're selling, anything a buyer should know..."
              maxLength={2000}
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={errors.category ? "has-error" : ""}
              >
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <span className="field-error">{errors.category}</span>}
            </div>

            <div className="field">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                value={form.condition}
                onChange={(e) => update("condition", e.target.value)}
                className={errors.condition ? "has-error" : ""}
              >
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="price">Price (₹)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className={errors.price ? "has-error" : ""}
              placeholder="0"
            />
            {errors.price && <span className="field-error">{errors.price}</span>}
            {suggestion && (
              <div className="price-hint" role="note">
                Similar listings on HostelHub: ₹{Math.round(suggestion.min)} – ₹{Math.round(suggestion.max)}
                {" "}(typical ₹{Math.round(suggestion.median)}, {suggestion.count} listings).
                <button
                  type="button"
                  className="price-hint-btn"
                  onClick={() => update("price", String(Math.round(suggestion.median)))}
                >
                  Use ₹{Math.round(suggestion.median)}
                </button>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="image">Photo</label>
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview of your item" />
                <div className="image-preview-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    Replace
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={removeImage} disabled={uploading}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="image-drop"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Choose a photo"}
              </button>
            )}
            <input
              id="image"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
            {uploading && imagePreview && <span className="field-hint">Uploading...</span>}
            {errors.image && <span className="field-error">{errors.image}</span>}
            <span className="field-hint">JPG, PNG, GIF or WebP, up to 5MB. Optional, but listings with photos get more attention.</span>
          </div>

          <div className="add-product-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || uploading}>
              {submitting ? (isEditMode ? "Saving..." : "Listing...") : (isEditMode ? "Save Changes" : "List Item")}
            </button>

            {isEditMode && (
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Listing"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
