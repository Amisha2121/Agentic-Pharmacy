# Complete Color Replacement Guide

## Global Find & Replace Instructions

Run these replacements across ALL `.tsx` files in `frontend/src/app/`:

### Background Colors
- `bg-[#09090B]` → `bg-[#F9FAFB]`
- `bg-[#0E0E11]` → `bg-white`
- `bg-[#111113]` → `bg-white`
- `bg-[#18181B]` → `bg-white`
- `bg-[#1F1F23]` → `bg-[#F9FAFB]`
- `bg-[#161619]` → `bg-[#F9FAFB]`
- `bg-[#0D1117]` → `bg-white`
- `bg-[#0C1525]` → `bg-[#F9FAFB]`
- `bg-[#0B1120]` → `bg-[#EFF6FF]`
- `bg-[#0C1A2E]` → `bg-[#DBEAFE]`
- `bg-[#1A2535]` → `bg-[#ECFDF5]`
- `bg-[#1E3A5F]` → `bg-[#BFDBFE]`

### Border Colors
- `border-[#27272A]` → `border-[#E5E7EB]`
- `border-[#1F1F23]` → `border-[#F3F4F6]`
- `border-[#1C1C1F]` → `border-[#E5E7EB]`
- `border-[#1A1A1D]` → `border-[#F3F4F6]`
- `border-[#3B1111]` → `border-[#FECACA]`

### Text Colors
- `text-[#F4F4F5]` → `text-[#111827]`
- `text-[#E4E4E7]` → `text-[#374151]`
- `text-[#D4D4D8]` → `text-[#374151]`
- `text-[#A1A1AA]` → `text-[#6B7280]`
- `text-[#71717A]` → `text-[#6B7280]`
- `text-[#52525B]` → `text-[#9CA3AF]`
- `text-[#3F3F46]` → `text-[#9CA3AF]`

### Accent Colors (Blue → Green)
- `bg-[#3B82F6]` → `bg-[#22C55E]`
- `bg-[#2563EB]` → `bg-[#16A34A]`
- `bg-[#1D4ED8]` → `bg-[#15803D]`
- `text-[#3B82F6]` → `text-[#22C55E]`
- `text-[#60A5FA]` → `text-[#16A34A]`
- `text-[#93C5FD]` → `text-[#86EFAC]`
- `border-[#3B82F6]` → `border-[#22C55E]`
- `hover:bg-[#2563EB]` → `hover:bg-[#16A34A]`

### Status Colors (Keep but lighten backgrounds)
- `bg-[#052E16]` → `bg-[#ECFDF5]` (success bg)
- `bg-[#166534]` → `bg-[#A7F3D0]` (success border)
- `bg-[#1A0000]` → `bg-[#FEE2E2]` (error bg)
- `bg-[#991B1B]` → `bg-[#FECACA]` (error border)
- `bg-[#451A03]` → `bg-[#FEF3C7]` (warning bg)
- `bg-[#92400E]` → `bg-[#FDE68A]` (warning border)
- `bg-[#1C0A00]` → `bg-[#FEF3C7]` (warning bg alt)
- `bg-[#1C1200]` → `bg-[#FEF3C7]` (warning bg alt2)

### Shadow Colors
- `shadow-[#3B82F6]/30` → `shadow-[#22C55E]/30`
- `shadow-[#3B82F6]/20` → `shadow-[#22C55E]/20`
- `shadow-blue-500/20` → `shadow-green-500/20`

### Hover States
- `hover:bg-[#1F1F23]` → `hover:bg-[#F9FAFB]`
- `hover:bg-[#111113]` → `hover:bg-[#F9FAFB]`
- `hover:bg-[#161619]` → `hover:bg-[#F9FAFB]`
- `hover:bg-[#27272A]` → `hover:bg-[#F3F4F6]`
- `hover:text-[#F4F4F5]` → `hover:text-[#111827]`
- `hover:text-[#A1A1AA]` → `hover:text-[#6B7280]`

## Files That Need Updates

### Priority 1 (Shown in Screenshots)
- ✅ ChatArea.tsx - DONE
- ✅ ChatHistory.tsx - DONE
- ✅ Sidebar.tsx - DONE
- ✅ MessageBubble.tsx - DONE
- ✅ ReorderAlerts.tsx - DONE
- ✅ ExpiredItems.tsx - DONE
- ✅ DrugInteractions.tsx - DONE
- ⚠️ LogDailySales.tsx - PARTIALLY DONE
- ❌ LiveInventory.tsx - NEEDS UPDATE

### Priority 2 (Other Pages)
- ❌ Quarantine.tsx
- ❌ Settings.tsx
- ❌ Login.tsx
- ❌ Signup.tsx

## Manual Steps Required

1. Open VS Code Find & Replace (Ctrl+Shift+H)
2. Set "Files to include": `frontend/src/app/**/*.tsx`
3. Run each replacement from the lists above
4. Test the application
5. Check for any remaining dark elements

## Notes
- Keep error/warning/success colors meaningful (red, yellow, green)
- Purple accent (#8B5CF6) for Drug Interactions is intentional
- All black badges should become light colored with dark text
- All blue accents should become green
