import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { Bold, ImageIcon, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@convex/_generated/dataModel";

interface SignatureEditorProps {
  initialSignature: string;
  signatureImageId?: Id<"_storage">;
}

// Configure DOMPurify to allow inline styles and safe HTML elements
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "img", "div", "span"],
    ALLOWED_ATTR: ["src", "alt", "style", "class"],
    ALLOW_DATA_ATTR: false,
  });
};

export function SignatureEditor({
  initialSignature,
  signatureImageId,
}: SignatureEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentContent, setCurrentContent] = useState(initialSignature);
  const [isEditing, setIsEditing] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<{ element: HTMLImageElement; rect: DOMRect } | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Mutations
  const updateSignature = useMutation(api.organizations.updateSignature);
  const generateUploadUrl = useMutation(api.organizations.generateSignatureImageUploadUrl);
  const saveSignatureImage = useMutation(api.organizations.saveSignatureImage);
  const removeSignatureImage = useMutation(api.organizations.removeSignatureImage);

  // Get Convex site URL for image preview
  // Derive from VITE_CONVEX_URL: https://xxx.convex.cloud -> https://xxx.convex.site
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string || "";
  const convexSiteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

  // Initialize currentContent and editor from initialSignature
  useEffect(() => {
    if (initialSignature) {
      const isHtml = initialSignature.trim().startsWith("<");
      const htmlContent = isHtml
        ? initialSignature
        : initialSignature
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join("");
      setCurrentContent(htmlContent);
      // Also update editor if it exists
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [initialSignature]);

  // Escape HTML for safety
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Handle editor content change
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setCurrentContent(newContent);
      setHasChanges(newContent !== initialSignature);
    }
  }, [initialSignature]);

  // Save current selection/cursor position
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // Handle bold command
  const handleBold = () => {
    document.execCommand("bold", false);
    editorRef.current?.focus();
  };

  // Handle image upload click - save cursor position first
  const handleImageClick = () => {
    saveSelection();
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PNG, JPG ou GIF.");
      return;
    }

    // Validate file size (max 500KB)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      toast.error("L'image est trop volumineuse. Maximum 500 Ko.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get upload URL
      const uploadUrl = await generateUploadUrl();

      // 2. Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // 3. Save storage ID to organization
      await saveSignatureImage({ storageId });

      // 4. Insert or replace image in editor
      if (editorRef.current) {
        const existingImage = editorRef.current.querySelector("img");
        const newSrc = `${convexSiteUrl}/signature-image/${storageId}`;

        if (existingImage) {
          // Replace: just update the src attribute
          existingImage.src = newSrc;
          handleInput();
          toast.success("Image remplacée");
        } else {
          // Add new image
          const imgHtml = `<p><img src="${newSrc}" alt="Signature" style="max-width: 600px; height: auto;" /></p>`;

          // Try to insert at saved cursor position
          if (savedSelectionRef.current && editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer)) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(savedSelectionRef.current);
            document.execCommand("insertHTML", false, imgHtml);
          } else {
            // No cursor position: insert at the beginning
            editorRef.current.innerHTML = imgHtml + editorRef.current.innerHTML;
          }
          handleInput();
          toast.success("Image ajoutée");
        }
        editorRef.current.focus();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle remove image
  const handleRemoveImage = async () => {
    if (!confirm("Supprimer l'image de signature ?")) return;

    setIsUploading(true);
    try {
      // Try to remove from storage (may fail if signatureImageId doesn't exist, that's OK)
      try {
        await removeSignatureImage();
      } catch {
        // Ignore error - image may already be removed from storage
      }

      // Remove image from editor HTML
      if (editorRef.current) {
        const images = editorRef.current.querySelectorAll("img");
        images.forEach((img) => {
          const parent = img.parentElement;
          img.remove();
          // Remove parent only if it's now empty (was just containing the image)
          if (parent && parent.innerHTML.trim() === "") {
            parent.remove();
          }
        });
        handleInput();
      }
      setHoveredImage(null);

      toast.success("Image supprimée");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!editorRef.current) return;

    setIsSaving(true);
    try {
      const htmlContent = editorRef.current.innerHTML;
      await updateSignature({ signature: htmlContent });
      setHasChanges(false);
      setIsEditing(false);
      toast.success("Signature enregistrée");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if content has an image
  const hasImage = currentContent.includes("<img");

  // Handle image hover in editor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !isEditing) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setHoveredImage({
            element: img,
            rect: new DOMRect(
              rect.left - containerRect.left,
              rect.top - containerRect.top,
              rect.width,
              rect.height
            ),
          });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      // Only clear if leaving the image and not entering the delete button
      if (target.tagName === "IMG" && !relatedTarget?.closest(".image-delete-overlay")) {
        setHoveredImage(null);
      }
    };

    editor.addEventListener("mouseover", handleMouseOver);
    editor.addEventListener("mouseout", handleMouseOut);

    return () => {
      editor.removeEventListener("mouseover", handleMouseOver);
      editor.removeEventListener("mouseout", handleMouseOut);
    };
  }, [isEditing]);

  // Handle cancel editing
  const handleCancelEdit = () => {
    // Reset content to initial signature
    const isHtml = initialSignature.trim().startsWith("<");
    const htmlContent = isHtml
      ? initialSignature
      : initialSignature
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join("");
    setCurrentContent(htmlContent);
    // Also reset editor
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
    setHasChanges(false);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Edit mode */}
      <div className={isEditing ? "" : "hidden"}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBold}
            title="Gras"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImageClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            {hasImage ? "Remplacer l'image" : "Ajouter une image"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Editor with image overlay */}
        <div ref={editorContainerRef} className="relative">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="min-h-[120px] border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white prose prose-sm max-w-none"
            style={{ whiteSpace: "pre-wrap" }}
          />

          {/* Delete button overlay on image hover */}
          {hoveredImage && (
            <div
              className="image-delete-overlay absolute pointer-events-auto"
              style={{
                left: hoveredImage.rect.left + hoveredImage.rect.width / 2 - 20,
                top: hoveredImage.rect.top + hoveredImage.rect.height / 2 - 20,
              }}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isUploading}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                title="Supprimer l'image"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
      </div>

      {/* Preview mode */}
      <div className={isEditing ? "hidden" : ""}>
        {currentContent ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentContent) }}
          />
        ) : (
          <p className="text-sm text-gray-400 italic">
            Aucune signature configurée
          </p>
        )}

        {/* Edit button */}
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Modifier
          </Button>
        </div>
      </div>
    </div>
  );
}
