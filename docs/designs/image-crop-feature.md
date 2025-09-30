# Image Crop Feature Design

# initial task 

in my twitter-like app i have image upload in 2 places: 
- posts creation
- user profile avatar upload



I want to add image CROP function for both cases. 
I'd like to keep existing image upload flow, "inserting" this crop thing. 
if user wants to change cropped image's crop - we do NOT do that, instead user will delete the image from post and add it again.

i want you to:
- use react-easy-crop
- ask questions if any
- make feasibility check
- make fit-gap check
- plan changes
- save to md file /docs/designs

## Overview
Add image cropping functionality to post creation and profile avatar upload using `react-easy-crop` library. The crop interface will be inserted into the existing upload flow without storing crop metadata.

## Requirements
- Use `react-easy-crop` for crop UI
- 1:1 square aspect ratio enforced, user adjusts with pinch/drag gestures
- Cropping happens BEFORE compression
- Delete and re-upload flow for changing crops (no re-crop functionality)
- Support for multiple image cropping in post creation (up to 10 images)

## Current Implementation Analysis

### Post Image Upload (`ImageUpload.tsx` + `CreatePost.tsx`)
**Flow:**
1. User selects files via drag-drop or file input (multiple selection allowed)
2. `processImages()` validates and processes each file:
   - Creates preview (base64)
   - Gets dimensions
   - Compresses to 1280px min side + 500px thumbnail
3. Adds to `ImageData[]` array displayed in preview grid
4. User can reorder/remove images before posting
5. On submit: creates post, then uploads all images via FormData

**Key files:**
- `frontend/src/components/ImageUpload.tsx` (105-177 lines: processImages)
- `frontend/src/components/CreatePost.tsx` (22-65 lines: uploadImages)

### Avatar Upload (`ProfileAvatar.tsx` + `ProfileEditor.tsx`)
**Flow:**
1. User clicks avatar, selects single file
2. `handleFileChange()` compresses to 96px min side JPEG
3. Calls `onImageUpload()` which uploads immediately to `/api/profile/me/avatar`
4. No preview/cancel - immediate upload

**Key files:**
- `frontend/src/components/profile/ProfileAvatar.tsx` (64-99 lines: handleFileChange)
- `frontend/src/components/profile/ProfileEditor.tsx` (56-91 lines: handleAvatarUpload)

## Feasibility Check

### react-easy-crop Library
✅ **Strengths:**
- Popular: 571k weekly downloads
- Supports JPEG, PNG, GIF, WebP
- TypeScript support included
- Touch-friendly (pinch zoom, drag to pan)
- Lightweight with automatic style injection
- Returns pixel coordinates via `onCropComplete` callback

✅ **Fit:**
- Perfect for mobile-first Telegram Web App
- Handles gesture controls natively
- No backend changes needed (crops applied client-side)

⚠️ **Considerations:**
- Requires parent with `position: relative`
- Modal scaling animations can affect cropper size
- Need to handle crop state for multiple images

## Fit-Gap Analysis

### Gaps to Address:
1. **Multiple image cropping**: Need to show crop UI for each selected image sequentially
2. **Crop → Compress flow**: Must apply crop to canvas/blob BEFORE compression
3. **State management**: Track which images are cropped vs pending
4. **Avatar immediate upload**: Change to preview-then-upload flow for consistency

### Good Fit:
- Existing compression pipeline can reuse after cropping
- `ImageData` interface already has preview/dimensions
- Modal pattern already used in `CreatePost.tsx`
- File validation already handles HEIC blocking

## Implementation Plan

### 1. Install Dependencies
```bash
cd frontend
npm install react-easy-crop
```

### 2. Create Crop Utility Functions
**New file:** `frontend/src/utils/image-crop.ts`
- `getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File>`
  - Load image to canvas
  - Apply crop coordinates
  - Return as File object (preserve original filename/type)

### 3. Create ImageCropModal Component
**New file:** `frontend/src/components/ImageCropModal.tsx`

**Props:**
```typescript
interface ImageCropModalProps {
  image: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio: number; // 1 for square
  cropShape: 'rect'; // always rect per requirements
}
```

**Features:**
- Full-screen modal with dark overlay
- `react-easy-crop` Cropper component
- Zoom slider (optional - pinch zoom is primary)
- "Cancel" and "Done" buttons
- Shows original filename in header

**State:**
- `crop: Point` - position
- `zoom: number` - zoom level
- `croppedAreaPixels: Area` - from onCropComplete callback

### 4. Create Multi-Image Crop Queue Component
**New file:** `frontend/src/components/ImageCropQueue.tsx`

**Purpose:** Handle sequential cropping of multiple images

**Props:**
```typescript
interface ImageCropQueueProps {
  images: File[]; // Array of files to crop
  onAllCropped: (croppedFiles: File[]) => void;
  onCancel: () => void;
  aspectRatio: number;
}
```

**Features:**
- Shows progress: "Cropping image 2 of 5"
- Displays current image in ImageCropModal
- Stores completed crops in state array
- Allows going back to previous image
- "Skip All" option to use originals without cropping

**Flow:**
1. Show first image in crop modal
2. On "Done", store cropped file, advance to next
3. On "Skip", store original file, advance to next
4. When done with all, call `onAllCropped(croppedFiles)`

### 5. Modify ImageUpload Component
**File:** `frontend/src/components/ImageUpload.tsx`

**Changes:**
1. Add state: `filesToCrop: File[]`
2. Add state: `showCropQueue: boolean`
3. Modify `processImages()`:
   - Remove immediate compression
   - Set `filesToCrop` and `showCropQueue = true`
4. Add `handleCroppedFiles()`:
   - Receives cropped files from ImageCropQueue
   - Runs existing compression pipeline
   - Creates ImageData objects
   - Updates images array
5. Render ImageCropQueue modal when `showCropQueue === true`

**Pseudocode:**
```typescript
const handleFileInput = (files: FileList) => {
  // Validate file types/sizes first
  const validFiles = validateFiles(files);
  setFilesToCrop(validFiles);
  setShowCropQueue(true);
};

const handleCroppedFiles = async (croppedFiles: File[]) => {
  setShowCropQueue(false);
  setIsProcessing(true);

  // Existing compression logic
  for (const file of croppedFiles) {
    const { compressed, thumbnail } = await compressImage(file);
    // ... create ImageData
  }

  setIsProcessing(false);
};
```

### 6. Modify ProfileAvatar Component
**File:** `frontend/src/components/profile/ProfileAvatar.tsx`

**Changes:**
1. Remove immediate compression in `handleFileChange()`
2. Add state: `fileToCrop: File | null`
3. Add state: `showCropModal: boolean`
4. Show ImageCropModal when file selected
5. On crop complete:
   - Compress cropped file (96px min side)
   - Call `onImageUpload(compressedFile)`

**Flow:**
```
User clicks → file input → set fileToCrop → show crop modal
  → user crops → compress → upload
```

### 7. Update ProfileEditor Component
**File:** `frontend/src/components/profile/ProfileEditor.tsx`

**Changes:**
- No changes needed (just receives compressed file from ProfileAvatar)

### 8. Add Skip Option (Optional Enhancement)
**For posts:** "Skip cropping" button in ImageCropQueue
**For avatar:** "Use without cropping" button in ImageCropModal

## Component Hierarchy

```
CreatePost
└── ImageUpload
    ├── ImageCropQueue (modal, shown when files selected)
    │   └── ImageCropModal (current image being cropped)
    │       └── Cropper (from react-easy-crop)
    └── Image previews (after cropping + compression)

ProfileEditor
└── ProfileAvatar
    ├── ImageCropModal (modal, shown when file selected)
    │   └── Cropper (from react-easy-crop)
    └── Avatar display
```

## File Changes Summary

### New Files:
1. `frontend/src/utils/image-crop.ts` - Crop utility functions
2. `frontend/src/components/ImageCropModal.tsx` - Single image crop UI
3. `frontend/src/components/ImageCropQueue.tsx` - Multi-image crop orchestrator

### Modified Files:
1. `frontend/src/components/ImageUpload.tsx` - Insert crop flow before compression
2. `frontend/src/components/profile/ProfileAvatar.tsx` - Insert crop flow before compression

### Dependencies:
1. `frontend/package.json` - Add `react-easy-crop`

## Implementation Sequence

1. ✅ Install `react-easy-crop`
2. ✅ Create `image-crop.ts` utility
3. ✅ Create `ImageCropModal.tsx` component
4. ✅ Test single image crop (standalone)
5. ✅ Create `ImageCropQueue.tsx` component
6. ✅ Integrate into `ImageUpload.tsx` (posts)
7. ✅ Test multi-image crop flow
8. ✅ Integrate into `ProfileAvatar.tsx` (avatar)
9. ✅ Test avatar crop flow
10. ✅ Add skip/cancel options
11. ✅ Test edge cases (max images, file errors, cancel flows)
12. ✅ Update tests in `ImageUpload.test.tsx` if exists

## Testing Checklist

### Post Images:
- [ ] Select 1 image → crop → compress → add to post
- [ ] Select 10 images → crop all → verify order preserved
- [ ] Select 5 images → cancel during crop → verify no images added
- [ ] Select 3 images → crop 2 → cancel on 3rd → verify 2 added
- [ ] Upload cropped images with post → verify backend receives correct data
- [ ] Remove cropped image → re-add → crop again (no stored crop data)

### Avatar:
- [ ] Select image → crop → compress → upload
- [ ] Cancel during crop → no upload
- [ ] Replace avatar → crop new image → verify old avatar replaced
- [ ] Test with very large image (8000x6000)
- [ ] Test with very small image (50x50)

### Mobile:
- [ ] Pinch zoom works on iOS/Android
- [ ] Drag to pan works
- [ ] Touch gestures don't conflict with page scroll

### Edge Cases:
- [ ] Crop area fills entire image → verify no crop artifacts
- [ ] Crop tiny section → verify quality acceptable after compression
- [ ] Rotate device during crop → verify cropper adjusts
- [ ] Select HEIC file → verify blocked before crop modal

## Technical Considerations

### Performance:
- Cropping happens in-memory (canvas operations)
- Large images may cause memory spikes - consider max resolution warning
- Sequential cropping of 10 images might take time - show progress clearly

### Browser Compatibility:
- Canvas API (widely supported)
- FileReader API (already in use)
- Touch events (already handled by react-easy-crop)

### Accessibility:
- Crop modal should trap focus
- ESC key to cancel
- Clear instructions ("Pinch to zoom, drag to position")

### Error Handling:
- Crop operation failure → show toast, use original file
- Large file canvas error → show "File too large to crop" toast
- Memory errors → graceful fallback

## Future Enhancements (Out of Scope)

- ❌ Re-crop functionality (explicitly excluded)
- ❌ Store crop metadata in backend
- ❌ Rotation support
- ❌ Filters/adjustments
- ❌ Different aspect ratios per user choice
- ✅ Skip cropping option (included in plan)

## Success Criteria

✅ User can crop images before posting (1:1 aspect ratio)
✅ User can crop avatar before upload (1:1 aspect ratio)
✅ Cropping works with touch gestures (pinch/drag)
✅ Multiple images (up to 10) can be cropped sequentially
✅ Compression happens after cropping
✅ No crop metadata stored (just cropped image)
✅ Delete + re-upload required to change crop
✅ Existing upload validation/compression logic preserved

## Timeline Estimate

- Setup + utilities: 1 hour
- ImageCropModal: 2 hours
- ImageCropQueue: 2 hours
- ImageUpload integration: 2 hours
- ProfileAvatar integration: 1 hour
- Testing + polish: 2 hours

**Total: ~10 hours**