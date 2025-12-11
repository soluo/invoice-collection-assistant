# RelanceZen Design System

Documentation du système de design pour l'application RelanceZen - outil de recouvrement automatisé de factures pour artisans, PME et indépendants.

---

## 1. Core Principles

**Aesthetic:** "Modern SaaS for Professionals"
Le design combine une esthétique professionnelle et épurée avec une identité de marque chaleureuse (orange). L'interface est claire, accessible et rassurante pour les artisans et PME.

**Visual Philosophy:**
- **Clarté avant tout** : Hiérarchie visuelle forte, espaces généreux
- **Chaleur professionnelle** : Orange chaleureux + gris neutres
- **Efficacité** : Design orienté action, CTAs évidents
- **Moderne mais accessible** : Pas de dark mode intimidant, interface lumineuse

**Target Audience:**
Artisans, PME, indépendants français qui veulent se faire payer facilement sans friction technique.

---

## 2. Brand Identity

### Logo
```tsx
<div className="flex items-center gap-2">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
    <Mail className="h-5 w-5" />
  </div>
  <h1 className="text-lg font-bold text-foreground">
    Relance<span className="text-brand-500">Zen</span>
  </h1>
</div>
```

**Caractéristiques:**
- Icône : `Mail` (Lucide) dans un carré orange arrondi
- Nom : "Relance**Zen**" avec "Zen" en orange (`text-brand-500`)
- Taille standard : 32px × 32px (logo), texte en `text-lg font-bold`

---

## 3. Color Palette

### Brand Colors (Orange Scale)
Couleur principale pour les CTAs, highlights et états actifs.

| Variable CSS | Hex | Tailwind Class | Usage |
|--------------|-----|----------------|-------|
| `--color-brand-50` | `#fff7ed` | `bg-brand-50` | Backgrounds très clairs, états hover subtils |
| `--color-brand-100` | `#ffedd5` | `bg-brand-100` | Backgrounds clairs |
| `--color-brand-200` | `#fed7aa` | `bg-brand-200` | Gradient blurs décoratifs |
| `--color-brand-500` | `#f97316` | `bg-brand-500` | **PRIMARY** - CTAs, logo, accents |
| `--color-brand-600` | `#ea580c` | `bg-brand-600` | **HOVER** - États hover des CTAs |
| `--color-brand-900` | `#7c2d12` | `bg-brand-900` | Texte sur fond orange |

### Neutral Colors (Slate Scale)
Utilisé pour le texte, les backgrounds et les bordures.

| Tailwind Class | Usage |
|----------------|-------|
| `bg-white` | Backgrounds principaux (cards, topbar) |
| `bg-slate-50` | Background page, états hover subtils |
| `bg-slate-100` | Backgrounds secondaires |
| `bg-slate-200` | Bordures, dividers |
| `text-slate-400` | Text tertiaire, placeholders |
| `text-slate-500` | Text secondaire, descriptions |
| `text-slate-600` | Text navigation inactive |
| `text-slate-700` | Text labels, semi-bold |
| `text-slate-900` | **Text principal**, headings |
| `bg-slate-850` | `#15202e` - Dark backgrounds (auth panel) |
| `bg-slate-900` | Dark backgrounds, footers |

### shadcn Theme Variables
Variables sémantiques définies dans `src/index.css` (format oklch pour meilleure perceptualité).

**Semantic Colors:**
```css
--color-primary       /* Orange brand (#f97316) - couleur principale du système */
--color-secondary     /* Gris neutre */
--color-accent        /* Gris clair pour hover */
--color-destructive   /* Rouge pour actions destructives */
--color-muted         /* Texte/background atténués */
```

**⚠️ Note:** Si `--color-primary` n'est pas encore configuré en orange, mettre à jour dans `src/index.css`:
```css
:root {
  --color-primary: oklch(0.6891 0.1938 41.5055); /* Orange #f97316 en oklch */
  --color-primary-foreground: oklch(1 0 0);       /* Blanc */
}
```

**Surface Colors:**
```css
--color-background    /* oklch(1 0 0) - blanc */
--color-foreground    /* oklch(0.1450 0 0) - noir */
--color-card          /* Blanc */
--color-popover       /* Blanc */
```

**Interactive:**
```css
--color-border        /* Bordures par défaut */
--color-input         /* Bordures inputs */
--color-ring          /* Focus rings */
```

**Usage Recommendation:**
- **Composants shadcn** : Utiliser `bg-primary` (qui doit pointer vers l'orange brand)
- **Éléments custom** : Utiliser directement `bg-brand-500`, `text-brand-600` pour plus de contrôle
- **Cohérence** : `--color-primary` DOIT être configuré en orange (#f97316) pour que tous les composants shadcn utilisent la couleur brand

---

## 4. Typography

### Font Family
**Primary:** `Rubik` (Google Fonts)
**Fallback:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`

```css
/* Défini dans src/index.css */
body {
  font-family: "Rubik", ui-sans-serif, system-ui, -apple-system, ...;
}
```

### Font Weights Available
- `300` - Light
- `400` - Regular
- `500` - Medium
- `600` - Semi-Bold
- `700` - Bold
- `800` - Extra Bold
- `900` - Black

### Type Scale Hierarchy

| Element | Classes | Usage |
|---------|---------|-------|
| **H1 (Hero)** | `text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight` | Landing page hero |
| **H1 (Page)** | `text-2xl md:text-3xl font-extrabold text-slate-900` | Page titles |
| **H2** | `text-3xl font-bold text-slate-900` | Section headers |
| **H3** | `text-xl font-bold text-slate-900` | Card titles |
| **Body Large** | `text-xl text-slate-600` | Descriptions, subtitles |
| **Body** | `text-base text-slate-700` | Text principal |
| **Body Small** | `text-sm text-slate-600` | Labels, captions |
| **Caption** | `text-xs text-slate-500` | Helper text, metadata |
| **Label** | `text-sm font-semibold text-slate-700` | Form labels |

**Text Colors:**
- Primary text: `text-slate-900`
- Secondary text: `text-slate-600`, `text-slate-500`
- Tertiary text: `text-slate-400`
- Link/Active: `text-brand-600`, `hover:text-brand-700`

---

## 5. Iconography

### Icon Library: **Lucide React**

**Package:** `lucide-react` v0.546.0

**Installation:**
```bash
pnpm add lucide-react
```

**Import Pattern:**
```tsx
import { Mail, ArrowRight, FileText, Settings } from "lucide-react";
```

### Icon Sizes

| Size | Tailwind Class | Usage |
|------|----------------|-------|
| Small | `w-4 h-4` (16px) | Inline icons, nav items |
| Medium | `w-5 h-5` (20px) | Buttons, logo |
| Large | `w-6 h-6` (24px) | Feature cards |
| XL | `w-8 h-8` (32px) | Hero section |

### Common Icons Used

**Navigation & Actions:**
- `Mail` - Logo, email features
- `FileText` - Factures, documents
- `Calendar` - Relances, scheduling
- `Settings` - Réglages
- `User` - Compte utilisateur
- `LogOut` - Déconnexion

**UI Elements:**
- `ChevronDown` - Dropdowns
- `ArrowRight` - CTAs, navigation forward
- `Play` - Démo interactive
- `X` - Fermeture modals
- `Menu` - Mobile menu

**Status & Feedback:**
- `Check`, `CheckCircle2` - Success, validation
- `Clock` - En attente, scheduled
- `Bell` - Notifications, reminders
- `AlertCircle` - Warnings
- `Loader2` - Loading states

**Features:**
- `CloudUpload` - Upload factures
- `TrendingUp` - Statistiques
- `Shield` - Sécurité
- `Bot` - Automatisation

### Usage Guidelines
```tsx
// ✅ Correct - Icon avec size cohérent
<ArrowRight className="w-5 h-5" />

// ✅ Correct - Icon dans button avec gap
<Button>
  Commencer <ArrowRight className="w-4 h-4" />
</Button>

// ❌ Incorrect - Pas de size défini
<Mail />
```

---

## 6. Spacing & Layout

### Container Pattern
```tsx
<div className="container mx-auto px-4 md:px-6">
  {/* Content */}
</div>
```

**Variants:**
- Landing pages: `container mx-auto px-4 md:px-6`
- App pages: `max-w-6xl mx-auto px-4 md:px-6`
- Narrow content: `max-w-md mx-auto` (auth forms)
- Wide content: `max-w-5xl mx-auto` (split layouts)

### Spacing Scale

| Gap | Tailwind | Usage |
|-----|----------|-------|
| 0.5rem | `gap-2` | Inline elements, buttons |
| 1rem | `gap-4` | Form fields, list items |
| 1.5rem | `gap-6` | Topbar elements, cards |
| 3rem | `gap-12` | Sections (mobile) |
| 5rem | `gap-20` | Hero sections (desktop) |

**Vertical Rhythm:**
```tsx
<div className="space-y-8">  {/* Entre sections */}
  <section className="space-y-4">  {/* Dans une section */}
    {/* Content */}
  </section>
</div>
```

### Responsive Breakpoints

**Primary Breakpoint:** `md:` (≥768px)

```tsx
// Pattern mobile-first
<div className="px-4 md:px-6">           {/* Padding responsive */}
<div className="text-xl md:text-3xl">    {/* Text size responsive */}
<div className="hidden md:flex">         {/* Desktop only */}
<div className="flex md:hidden">         {/* Mobile only */}
```

**Common Responsive Patterns:**
- Grid: `grid-cols-1 md:grid-cols-3`
- Flex direction: `flex-col lg:flex-row`
- Text alignment: `text-center lg:text-left`

---

## 7. Effects & Shadows

### Custom Shadows

Définies dans `src/index.css` (@theme).

```css
--shadow-card: 0 10px 40px -10px rgba(0,0,0,0.1);
--shadow-glow: 0 0 20px rgba(249, 115, 22, 0.3);
```

**Usage:**
```tsx
// Card elevation
<div className="shadow-card">...</div>

// Brand glow sur CTAs
<button className="shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50">
  Commencer
</button>
```

**Standard Tailwind Shadows:**
- `shadow-sm` - Subtle (borders alternative)
- `shadow-lg` - Dropdowns, modals
- `shadow-xl` - Floating elements
- `shadow-2xl` - Dialogs

### Background Patterns

#### Grid Pattern (Light)
Utilisé sur le hero de la landing page.

```tsx
<div className="bg-white opacity-80 bg-[linear-gradient(#f1f5f9_1.2px,transparent_1.2px),linear-gradient(90deg,#f1f5f9_1.2px,transparent_1.2px)] [background-size:30px_30px]">
</div>
```

#### Dark Grid Pattern
Utilisé sur le panel auth (testimonial).

```css
/* Défini dans src/index.css */
.auth-pattern {
  background-color: #0f172a;
  background-image: linear-gradient(#1e293b 1.2px, transparent 1.2px),
                    linear-gradient(90deg, #1e293b 1.2px, transparent 1.2px);
  background-size: 40px 40px;
}
```

### Gradient Blurs
Blobs décoratifs floutés pour ajouter de la profondeur.

```tsx
{/* Orange blob - top right */}
<div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200 rounded-full blur-3xl opacity-30" />

{/* Blue blob - top left */}
<div className="absolute top-40 -left-20 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30" />
```

### Animations

#### Float Animation
Oscillation verticale douce (6s loop).

```css
/* Défini dans src/index.css */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
```

**Usage:**
```tsx
<div className="animate-float">
  {/* Interactive demo, testimonial cards */}
</div>
```

### Glassmorphism
Utilisé **uniquement** sur le header de la landing page au scroll.

```tsx
<header className="bg-white/95 backdrop-blur-md border-b border-slate-200">
  {/* Content */}
</header>
```

**Note:** Le topbar de l'app utilise un fond **blanc solide** sans glassmorphism.

---

## 8. Border Radius

### Radius Scale

Basé sur `--radius: 0.625rem` (10px) défini dans les CSS variables.

| Variable CSS | Computed | Tailwind Class | Usage |
|--------------|----------|----------------|-------|
| `--radius-sm` | `6px` | `rounded-sm` | Très petits éléments |
| `--radius-md` | `8px` | `rounded-md` | Boutons shadcn par défaut |
| `--radius-lg` | `10px` | `rounded-lg` | Nav items, inputs, badges |
| `--radius-xl` | `14px` | `rounded-xl` | Boutons brand, cards moyennes, dropdowns |
| - | - | `rounded-2xl` | Large containers, modals, feature cards |
| - | - | `rounded-full` | Avatars, pills, decorative circles |

### Component-Specific Usage

```tsx
// Nav items / Inputs
className="rounded-lg"

// Brand CTAs / Medium cards
className="rounded-xl"

// Large cards / Modals
className="rounded-2xl"

// Avatars / Pills
className="rounded-full"
```

---

## 9. shadcn/ui Component System

### Philosophy
Le projet utilise **shadcn/ui** comme système de composants de base, avec des extensions brand-specific pour les CTAs et éléments clés.

**Avantages:**
- Composants accessibles (Radix UI)
- Personnalisables via CSS variables
- Type-safe avec TypeScript
- Cohérence visuelle garantie

### Available Components

Tous les composants sont dans `src/components/ui/`.

**Form Components:**
- `Button` - Variants: default, destructive, outline, secondary, ghost, link
- `Input` - Text inputs avec support icônes
- `Label` - Labels de formulaires
- `Textarea` - Multi-line inputs
- `Select` - Dropdowns
- `Radio Group` - Radio buttons
- `Switch` - Toggle switches

**Layout Components:**
- `Card` - Content containers
- `Sidebar` - Navigation sidebar (mobile)
- `Tabs` - Tabbed interfaces
- `Collapsible` - Expandable sections
- `Dialog` - Modals
- `Popover` - Floating popovers

**Data Display:**
- `Avatar` - User avatars avec fallback
- `Badge` - Pills et status badges
- `Calendar` - Date picker
- `Pagination` - Page navigation

**Navigation:**
- `Dropdown Menu` - Dropdowns avec items

### Theme CSS Variables

Toutes les variables sont définies dans `src/index.css` (`:root` et `.dark`).

**Color Variables:**
```css
--color-primary             /* Orange brand #f97316 (MUST be configured) */
--color-secondary           /* Slate-100 */
--color-accent              /* Slate-100 */
--color-destructive         /* Red */
--color-muted               /* Slate-100 */
--color-muted-foreground    /* Slate-500 */
--color-border              /* Slate-200 */
--color-input               /* Slate-200 */
--color-ring                /* Slate-700 */
```

**Custom Brand Variables:**
```css
--color-brand-50 through --color-brand-900  /* Orange scale */
--color-slate-850                           /* Custom dark */
```

**Radius Variables:**
```css
--radius: 0.625rem;
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

**Shadow Variables:**
```css
--shadow-sm, --shadow, --shadow-md, --shadow-lg, --shadow-xl, --shadow-2xl
--shadow-card: 0 10px 40px -10px rgba(0,0,0,0.1);
--shadow-glow: 0 0 20px rgba(249, 115, 22, 0.3);
```

### Component Variants (CVA)

shadcn utilise `class-variance-authority` pour les variants.

**Example: Button**
```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "hover:bg-accent",
        link: "text-primary underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
  }
);
```

**Usage:**
```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Valider</Button>
<Button variant="outline">Annuler</Button>
<Button variant="destructive">Supprimer</Button>
```

### Customization Strategy

#### 1. Use shadcn as Base
Pour les composants standards (forms, dialogs, etc.), utiliser shadcn tel quel.

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

<Button variant="outline">Annuler</Button>
<Input type="email" placeholder="Email" />
```

#### 2. Extend with Brand Classes
Pour les CTAs brand, ajouter des classes Tailwind custom.

```tsx
<Button
  className="bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl
             shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50
             hover:-translate-y-1 transition-all"
>
  Commencer gratuitement <ArrowRight className="w-4 h-4" />
</Button>
```

#### 3. Override CSS Variables
Pour des changements theme-wide, modifier les CSS variables.

```css
/* src/index.css */
:root {
  /* ✅ PRIMARY DOIT ÊTRE ORANGE */
  --color-primary: oklch(0.6891 0.1938 41.5055);        /* #f97316 orange */
  --color-primary-foreground: oklch(1 0 0);             /* Blanc */

  /* Ou en RGB (moins recommandé) */
  --color-primary: rgb(249, 115, 22);
  --color-primary-foreground: rgb(255, 255, 255);
}
```

#### 4. Use cn() Utility
Pour merger des classes conditionnellement.

```tsx
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded-lg",
    isActive ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"
  )}
>
  Nav Item
</button>
```

### When to Use shadcn vs Custom Components

**Use shadcn when:**
- ✅ Composant standard (forms, dialogs, tabs)
- ✅ Besoin d'accessibilité (focus management, ARIA)
- ✅ Design cohérent avec le système (primary = orange)

**Use Custom when:**
- ✅ Effets spéciaux requis (glow, float animations)
- ✅ Interactions custom complexes
- ✅ Optimisation performance critique

**Recommended Approach:**
```tsx
// ✅ BEST - Use shadcn Button with variant="default"
// (Will automatically use orange if --color-primary is configured)
<Button variant="default">
  Valider <ArrowRight className="w-4 h-4" />
</Button>

// ✅ GOOD - Extend with brand glow for CTAs
<Button
  variant="default"
  className="shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-1"
>
  Commencer gratuitement
</Button>

// ⚠️ AVOID - Manual bg-brand-500 unless --color-primary is not configured
<Button className="bg-brand-500 hover:bg-brand-600">
  CTA Text
</Button>
```

---

## 10. Component Patterns

### Buttons

#### Primary CTA (Brand)
```tsx
<button className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1 hover:shadow-brand-500/50 flex items-center gap-2">
  Commencer gratuitement
  <ArrowRight className="w-5 h-5" />
</button>
```

#### Secondary
```tsx
<button className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-lg font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
  Voir la démo
</button>
```

#### Small Action Button
```tsx
<button className="px-3 py-1.5 text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 font-bold rounded-md transition-colors">
  Remind
</button>
```

#### shadcn Button Variants
```tsx
import { Button } from "@/components/ui/button";

{/* variant="default" utilise bg-primary (doit être orange) */}
<Button variant="default">Valider</Button>
<Button variant="outline">Annuler</Button>
<Button variant="destructive">Supprimer</Button>
<Button variant="ghost">Options</Button>

{/* Pour CTAs avec effet glow */}
<Button
  variant="default"
  className="shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50"
>
  Commencer
</Button>
```

### Input Fields

#### Standard Input with Icon
```tsx
<div className="relative">
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
    <Mail className="w-4 h-4 text-slate-400" />
  </div>
  <Input
    type="email"
    placeholder="email@example.com"
    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
  />
</div>
```

#### shadcn Input
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Email" />
</div>
```

### Cards

#### Feature Card
```tsx
<div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 hover:border-brand-200 transition-colors group">
  <div className="w-14 h-14 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center text-2xl mb-4 group-hover:bg-brand-500 group-hover:text-white transition-all">
    <FileText className="w-6 h-6" />
  </div>
  <h3 className="text-xl font-bold text-slate-900 mb-2">
    Titre de la feature
  </h3>
  <p className="text-slate-600">
    Description de la fonctionnalité.
  </p>
</div>
```

#### shadcn Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Navigation

#### NavLink Pattern
```tsx
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

<NavLink
  to="/invoices"
  className={({ isActive }) =>
    cn(
      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
      isActive
        ? "text-brand-600 bg-brand-50"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
    )
  }
>
  Factures
</NavLink>
```

### Avatars

#### shadcn Avatar with Initials
```tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

<Avatar className="h-8 w-8 bg-primary text-white">
  <AvatarFallback className="bg-primary text-white font-semibold">
    JD
  </AvatarFallback>
</Avatar>
```

#### Custom Avatar Circle
```tsx
<div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
  SM
</div>
```

### Badges / Pills

#### Status Badge
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
  Paid
</span>
```

#### shadcn Badge
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">New</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="destructive">Overdue</Badge>
<Badge variant="outline">Pending</Badge>
```

### Dropdowns

#### Custom Dropdown Menu
```tsx
<div className="relative">
  <button className="flex items-center gap-2 hover:bg-slate-50 p-1 pr-3 rounded-full">
    <Avatar />
    <span className="text-sm font-semibold">User Name</span>
    <ChevronDown className="w-3 h-3 text-slate-400" />
  </button>

  {isOpen && (
    <div className="absolute right-0 z-30 mt-3 w-60 rounded-xl border border-gray-200 bg-white shadow-lg">
      <button className="flex w-full items-center gap-2 px-4 py-3 hover:bg-gray-50">
        <Settings className="w-4 h-4" />
        Réglages
      </button>
    </div>
  )}
</div>
```

#### shadcn DropdownMenu
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger>Options</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Modifier</DropdownMenuItem>
    <DropdownMenuItem>Supprimer</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 11. Responsive Design

### Mobile-First Approach

Toujours designer d'abord pour mobile, puis ajouter les breakpoints desktop.

```tsx
// ✅ Correct - Mobile first
<div className="text-xl md:text-3xl">

// ❌ Incorrect - Desktop first
<div className="text-3xl md:text-xl">
```

### Breakpoint Strategy

**Primary Breakpoint:** `md:` (≥768px)
La majorité des changements se font à `md:`.

**Common Patterns:**

```tsx
// Layout
<div className="flex-col lg:flex-row">  {/* Stack mobile, side-by-side desktop */}

// Grid
<div className="grid-cols-1 md:grid-cols-3">  {/* 1 col mobile, 3 cols desktop */}

// Spacing
<div className="px-4 md:px-6">  {/* Smaller padding mobile */}

// Typography
<h1 className="text-4xl md:text-6xl">  {/* Smaller text mobile */}

// Visibility
<div className="hidden md:flex">  {/* Desktop only */}
<div className="flex md:hidden">  {/* Mobile only */}
```

### Common Responsive Patterns

#### Hero Section (Split Layout)
```tsx
<div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
  <div className="lg:w-1/2 text-center lg:text-left">
    {/* Left content */}
  </div>
  <div className="lg:w-1/2">
    {/* Right content */}
  </div>
</div>
```

#### Feature Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {features.map(feature => (
    <Card key={feature.id}>{/* Feature card */}</Card>
  ))}
</div>
```

#### Responsive Topbar
```tsx
<header className="h-16 px-4 md:px-6">
  <SidebarTrigger className="md:hidden" />  {/* Mobile hamburger */}
  <div className="hidden md:flex">  {/* Desktop logo */}
    <Logo />
  </div>
  <nav className="hidden md:flex">  {/* Desktop nav */}
    {/* Nav items */}
  </nav>
</header>
```

---

## 12. Usage Guidelines & Best Practices

### Do's ✅

- **Configurer `--color-primary` en orange** dans `src/index.css` AVANT d'utiliser shadcn
- **Utiliser shadcn components** comme base pour forms, dialogs, navigation
- **Utiliser `variant="default"`** sur Button pour avoir automatiquement l'orange
- **Étendre avec brand classes** pour les effets (glow, shadows)
- **Respecter la hiérarchie typographique** (h1 → h2 → body)
- **Utiliser `cn()` utility** pour merger des classes conditionnellement
- **Mobile-first responsive design** avec breakpoint `md:` principal
- **Lucide icons** avec sizes cohérents (`w-4 h-4`, `w-5 h-5`)
- **Espaces généreux** entre sections (gap-6, gap-12)
- **Focus sur l'accessibilité** (labels, ARIA, keyboard nav)

### Don'ts ❌

- **Ne pas laisser `--color-primary` en indigo** - MUST be orange (#f97316)
- **Ne pas mélanger FontAwesome et Lucide** - uniquement Lucide
- **Éviter les dark modes** non testés - stick to light theme
- **Ne pas surcharger d'animations** - keep it subtle (float only)
- **Éviter les couleurs custom** hors palette brand - use slate + brand-*
- **Ne pas ignorer les CSS variables shadcn** - les utiliser pour cohérence
- **Éviter les radius inconsistants** - suivre la scale (lg, xl, 2xl, full)
- **Ne pas hardcoder `bg-brand-500`** sur shadcn Button - use `variant="default"` instead

### Accessibility Checklist

- [ ] Tous les inputs ont des `<Label>` associés
- [ ] Les boutons ont du texte ou `aria-label`
- [ ] Les focus states sont visibles (`focus:ring-4 focus:ring-brand-500/10`)
- [ ] Le contraste texte/background est suffisant (WCAG AA minimum)
- [ ] Les icônes décoratives sont masquées des screen readers
- [ ] Navigation clavier fonctionnelle (Tab, Enter, Escape)

---

## 13. Quick Reference

### Key Files

- **Theme Configuration:** `src/index.css` (@theme, CSS variables)
- **shadcn Components:** `src/components/ui/`
- **Utility Functions:** `src/lib/utils.ts` (cn() function)
- **Type Definitions:** `src/components/ui/*.tsx` (component interfaces)

### Key Imports

```tsx
// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Icons
import { Mail, ArrowRight, FileText } from "lucide-react";

// Navigation
import { NavLink } from "react-router-dom";

// Utilities
import { cn } from "@/lib/utils";
```

### Common Class Combinations

```tsx
// Primary CTA
"bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 px-8 py-4"

// Card
"bg-white rounded-2xl shadow-card border border-slate-100 p-6"

// Input with focus
"rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"

// Nav item active
"px-4 py-2 rounded-lg text-brand-600 bg-brand-50 font-medium"
```

---

**Version:** 1.0
**Last Updated:** 2025-12-11
**Maintainer:** RelanceZen Team
