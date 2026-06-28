# Layout Rules — SVGPack / IconPack Hub

> **THIS FILE MUST BE READ BEFORE EVERY UI CHANGE.**
> Violating these rules breaks the entire site layout.

---

## 1. Container System

The project uses **custom container utility classes** defined in `src/app/globals.css`.  
**NEVER use Tailwind utility-based containers** (`max-w-*`, `mx-auto`, `px-4 sm:px-6`, etc.) as page-level wrappers.

### Available containers

| Class | Purpose | Defined in globals.css |
|---|---|---|
| `container-wide` | Full-width pages with fluid responsive padding. Used for: catalog, pack view, builder, customize, admin, billing | `padding-inline: 1.6rem` → `36rem` across breakpoints |
| `container-narrow` | Text-heavy / form pages with capped max-width (90rem). Used for: account, login, FAQ, empty states | `max-width: 90rem` + responsive padding |

### MANDATORY mapping per page

| View / Page | Container class |
|---|---|
| Home (`home.tsx`) | `container-wide` per section |
| Catalog (`catalog.tsx`) | `container-wide` |
| Pack View (`pack-view.tsx`) | `container-wide` |
| Customize (`customize.tsx`) | `container-wide` |
| Builder (`builder.tsx`) | `container-wide` |
| Admin (`admin.tsx`) | `container-wide` (main), `container-narrow` (unauthorized state) |
| Billing / Pricing (`billing.tsx`) | `container-wide` |
| My Packs (`my-packs.tsx`) | `container-wide` (main), `container-narrow` (not-logged-in state) |
| Account (`account.tsx`) | `container-narrow` |
| Empty / 404 / Loading states | Same container as parent page |
| Header, Footer | Use `container-wide` (defined in `shell.tsx`) |

### FORBIDDEN patterns (container-level)

```tsx
// ❌ NEVER DO THIS as a page-level container wrapper:
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
<div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
<div className="max-w-md mx-auto px-4 sm:px-6 py-20">

// ✅ CORRECT:
<div className="container-wide py-10">
<div className="container-narrow py-20">
```

### When `max-w-*` IS acceptable

Only for **inner content elements** inside a container, e.g. constraining a text block:
```tsx
<div className="container-wide py-10">
  <div className="mx-auto max-w-2xl text-center">  {/* ← inner, OK */}
    <h2>...</h2>
  </div>
</div>
```

---

## 2. Shell Structure

```
<Shell>                     ← shell.tsx
  <Header>                  ← container-wide inside header
  <main className="flex-1"> ← NO container here, each view adds its own
    {children}              ← each view wraps itself in container-wide/narrow
  </main>
  <Footer>                  ← container-wide inside footer
</Shell>
```

- **DO NOT** add container classes to `<main>` in shell.tsx.
- Each view is responsible for its own container wrapper as the **outermost element**.

---

## 3. Quick checklist before committing UI changes

- [ ] Root wrapper of every view uses `container-wide` or `container-narrow`
- [ ] No `max-w-7xl mx-auto px-4 sm:px-6` or similar as page container
- [ ] Loading/empty/404 states use the same container class as the main view
- [ ] Inner elements needing width constraints use `max-w-*` ONLY inside a proper container
