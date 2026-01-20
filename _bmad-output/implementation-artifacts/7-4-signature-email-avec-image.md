# Story 7.4: Signature Email avec Image

Status: ready-for-dev

## Story

As an **admin**,
I want **to configure an email signature with formatting (bold) and an optional image (logo)**,
So that **all outgoing emails look professional and branded**.

## Acceptance Criteria

### AC1: Signature Editor in Settings
**Given** I am an admin on the /settings page
**When** I scroll to the signature section (currently missing from UI)
**Then** I see a mini text editor for the signature
**And** the editor allows basic formatting: **bold** text
**And** the current signature content is pre-filled

### AC2: Signature Image Upload (Optional)
**Given** I am in the signature editor
**When** I click "Ajouter une image"
**Then** I can select an image file (PNG, JPG, or GIF, max 500KB)
**And** the image is uploaded to Convex storage
**And** the image is inserted in the signature content
**And** a preview shows how it will appear

### AC3: Image Served via Public URL
**Given** a signature image is uploaded
**When** the image is stored
**Then** it is accessible via a public HTTP endpoint: `/organization/{orgId}/signature.{ext}`
**And** the URL can be used in HTML emails with `<img src="...">`

### AC4: Remove Signature Image
**Given** a signature image exists
**When** I remove the image from the editor
**Then** the image is deleted from storage
**And** future emails will not include the image

### AC5: HTML Emails with Formatted Signature
**Given** a signature with formatting and/or image is configured
**When** any email is sent (invoice, reminder, invitation)
**Then** the email is sent as HTML (not plain text)
**And** bold text is rendered as `<strong>`
**And** the image is included via `<img src="https://.../organization/{orgId}/signature.png">`

### AC6: Signature Preview
**Given** I have edited the signature
**When** I view the editor
**Then** I see a live preview of how the signature will appear in emails

### AC7: Save Signature
**Given** I have modified the signature content
**When** I click "Enregistrer"
**Then** the signature (HTML content) is saved to the organization
**And** a success toast confirms the save

## Tasks / Subtasks

### Task 1: Backend - Update Schema for HTML Signature (AC: #1, #2)
- [ ] 1.1 The `signature` field already exists as `v.string()` - will now store HTML content
- [ ] 1.2 Add `signatureImageId` field to organizations table (optional Storage ID)
- [ ] 1.3 Run `pnpm dev:backend` to validate schema

### Task 2: Backend - HTTP Endpoint for Signature Image (AC: #3)
- [ ] 2.1 Add route in `convex/router.ts`: `GET /organization/{orgId}/signature.png`
- [ ] 2.2 Handler fetches organization's `signatureImageId` from DB
- [ ] 2.3 If image exists, fetch from Storage and return with correct Content-Type
- [ ] 2.4 If no image, return 404
- [ ] 2.5 Add appropriate cache headers (e.g., `Cache-Control: public, max-age=3600`)

### Task 3: Backend - Signature Mutations (AC: #1, #2, #4, #7)
- [ ] 3.1 Create/update `updateSignature` mutation (accepts HTML string)
- [ ] 3.2 Create `generateSignatureImageUploadUrl` mutation
- [ ] 3.3 Create `saveSignatureImage` mutation (saves storageId after upload)
- [ ] 3.4 Create `removeSignatureImage` mutation
- [ ] 3.5 Ensure `getCurrentOrganization` returns `signature` and `signatureImageId`
- [ ] 3.6 Admin-only access validation for all mutations

### Task 4: Backend - Update Email Sending to HTML (AC: #5)
- [ ] 4.1 Create `convex/lib/emailHtml.ts` utility module
- [ ] 4.2 Implement `wrapEmailAsHtml(textContent: string, signatureHtml: string)` function
- [ ] 4.3 Update `convex/reminders.ts:sendReminderEmail` - change contentType to "HTML"
- [ ] 4.4 Update `convex/invoiceEmails.ts:sendInvoiceEmail` - change contentType to "HTML"
- [ ] 4.5 Update `convex/emails.ts:sendSimulatedTestEmail` - change contentType to "HTML"
- [ ] 4.6 Update `convex/invitationEmails.ts` if it uses signature
- [ ] 4.7 Signature HTML is appended as-is (already formatted)

### Task 5: Frontend - Add Signature Section in Settings (AC: #1, #6, #7)
- [ ] 5.1 Add "Signature email" section in `OrganizationSettings.tsx`
- [ ] 5.2 Position in "Gestion des relances" section or as separate section after "Modèles d'emails"
- [ ] 5.3 Add mini rich-text editor with toolbar: **Bold** button only
- [ ] 5.4 Add "Ajouter une image" button in toolbar
- [ ] 5.5 Load current signature from organization data
- [ ] 5.6 Add "Enregistrer" button to save changes
- [ ] 5.7 Show success toast on save

### Task 6: Frontend - Image Upload in Editor (AC: #2, #4)
- [ ] 6.1 Implement image upload flow (get URL, upload, save storageId)
- [ ] 6.2 Insert image in editor as `<img src="/organization/{orgId}/signature.png">`
- [ ] 6.3 Display image preview in editor
- [ ] 6.4 Add remove button (X) on image
- [ ] 6.5 Validate file type (PNG, JPG, GIF) and size (max 500KB)
- [ ] 6.6 Show upload progress indicator

### Task 7: Frontend - Live Preview (AC: #6)
- [ ] 7.1 Add preview panel below/beside editor
- [ ] 7.2 Preview updates in real-time as user edits
- [ ] 7.3 Preview shows formatted text and image

### Task 8: Testing & Validation
- [ ] 8.1 Run `pnpm dev:backend` - verify no Convex errors
- [ ] 8.2 Run `pnpm lint` - verify no TypeScript/ESLint errors
- [ ] 8.3 Manual test: Edit signature with bold text
- [ ] 8.4 Manual test: Upload signature image, verify preview
- [ ] 8.5 Manual test: Access image via public URL `/organization/{orgId}/signature.png`
- [ ] 8.6 Manual test: Send reminder email, verify HTML format with signature
- [ ] 8.7 Manual test: Remove image, verify signature without image

## Dev Notes

### CRITICAL: Signature Field Already Exists

The `signature` field exists in the schema (`convex/schema.ts:25`) as `v.string()`. It's currently used as plain text appended to emails. This story upgrades it to store **HTML content** for rich formatting.

**Current usage to update:**
- `convex/invoiceEmails.ts:257-260`: `emailContent += \`\n\n${org.signature}\``
- Other email files append signature similarly

**After this story:**
- Signature stored as HTML (e.g., `<p><strong>Cordialement,</strong></p><p>L'équipe</p>`)
- Emails sent as HTML with signature appended directly

### HTTP Endpoint for Signature Image

**URL Pattern:** `GET /organization/{organizationId}/signature.png`

**Why this approach:**
- Public URL works in all email clients
- No base64 bloat in emails
- Image can be updated without resending emails
- Future-ready for open tracking (backlog)

**Implementation in `convex/router.ts`:**
```typescript
http.route({
  path: "/organization/{orgId}/signature.png",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const orgId = pathParts[2]; // /organization/{orgId}/signature.png

    // Get organization's signature image
    const org = await ctx.runQuery(internal.organizations.getSignatureImageForHttp, {
      organizationId: orgId as Id<"organizations">,
    });

    if (!org?.signatureImageId) {
      return new Response("Not found", { status: 404 });
    }

    // Fetch image from storage
    const imageBlob = await ctx.storage.get(org.signatureImageId);
    if (!imageBlob) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(imageBlob, {
      headers: {
        "Content-Type": "image/png", // Or detect from stored metadata
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});
```

### Mini Rich-Text Editor

**Requirements:**
- Simple editor, NOT a full WYSIWYG
- Only **bold** formatting (no italic, underline, lists, etc.)
- Image insertion via button
- Output: HTML string

**Recommended approach:** Use `contentEditable` div with minimal toolbar

```tsx
// Simplified editor component concept
function SignatureEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleBold = () => {
    document.execCommand('bold', false);
  };

  const handleImageInsert = (imageUrl: string) => {
    document.execCommand('insertImage', false, imageUrl);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-2 border-b pb-2 mb-2">
        <Button variant="outline" size="sm" onClick={handleBold}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddImage}>
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[100px] border rounded p-3 focus:outline-none"
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
}
```

**Alternative:** Use a lightweight library like `@tiptap/react` with minimal extensions.

### Email HTML Conversion

**Plain text to HTML utility (`convex/lib/emailHtml.ts`):**
```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export function wrapEmailAsHtml(
  textContent: string,
  signatureHtml: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; color: #1f2937; }
    p { margin: 0 0 1em 0; }
    img { max-width: 200px; height: auto; }
  </style>
</head>
<body>
${textToHtml(textContent)}
<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e5e5;">
${signatureHtml}
</div>
</body>
</html>`;
}
```

### Schema Addition

```typescript
// Add to organizations table in convex/schema.ts
signatureImageId: v.optional(v.id("_storage")), // ✅ Story 7.4
```

### Convex Site URL

The HTTP endpoint URL will be:
- Development: `https://{deployment-name}.convex.site/organization/{orgId}/signature.png`
- Production: Same pattern with production deployment

Get the base URL via environment variable or Convex deployment info.

### UI Placement in Settings

The signature editor should be placed in the **"Gestion des relances"** section, after the "Joindre le PDF" toggle and before the "Séquence de relance" list. Or as a dedicated section "Signature email" after "Modèles d'emails".

### Migration Consideration

Existing organizations have plain text in `signature` field. Options:
1. **Auto-wrap on read:** If signature doesn't start with `<`, wrap in `<p>` tags
2. **One-time migration:** Update all existing signatures to HTML format
3. **Graceful handling:** Email sending checks if signature is HTML or plain text

Recommended: Option 1 (auto-wrap on read) for simplicity.

### Backlog: Email Open Tracking

**NOT included in this story** - tracking email opens via the signature image URL is deferred to a future story. The HTTP endpoint is designed to be extensible for this feature later.

### References

- Existing HTTP routes: [Source: convex/router.ts]
- Organization schema: [Source: convex/schema.ts:8-62]
- Current signature usage: [Source: convex/invoiceEmails.ts:257-260]
- Settings UI: [Source: src/pages/OrganizationSettings.tsx]
- Epics requirements: [Source: _bmad-output/planning-artifacts/epics.md:1021-1042]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

