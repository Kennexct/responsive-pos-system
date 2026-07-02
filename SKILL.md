---
name: mega-skill
description: Unified senior development skill combining Design Taste, UI/UX Pro Max, ECC, Senior Frontend, Backend, Architect, Security, Fullstack, and DevOps. Applied to ALL development, changes, and UI/UX work in this project.
---

# MEGA SKILL — Unified Senior Development Intelligence

> This skill combines 9 world-class development skills into one unified system.
> Applied automatically to ALL code changes, UI/UX work, architecture decisions, and deployments.

---

## SKILL 1: DESIGN TASTE (Anti-Slop Frontend)

### Brief Inference (Read the Room)
Before touching code, infer what the user actually wants:
1. **Page kind** — landing, portfolio, dashboard, e-commerce, admin panel
2. **Vibe words** — minimalist, premium, playful, editorial
3. **Reference signals** — URLs, screenshots, product names
4. **Audience** — B2B, consumer, admin staff, customers
5. **Brand assets** — existing logo, colors, typography

### Three Dials
- **DESIGN_VARIANCE: 7** — Layout experimentation (1=Symmetric, 10=Artsy)
- **MOTION_INTENSITY: 5** — Animation depth (1=Static, 10=Cinematic)
- **VISUAL_DENSITY: 4** — Information per viewport (1=Airy, 10=Packed)

### Anti-Default Discipline
NEVER default to: AI-purple gradients, centered hero over dark mesh, three equal feature cards, generic glassmorphism, infinite-loop micro-animations, Inter + slate-900 as lazy defaults.

### Typography Rules
- **Display:** Use project's `--font-display` (Playfair Display for FreshMart)
- **Body:** Use project's `--font-body` (Inter for FreshMart)
- **Serif discipline:** Serif only when brand literally requires it
- **Emphasis:** Use italic/bold of SAME font family, never mix families
- **Italic descenders:** Use `leading-[1.1]` minimum for italic display type with descender letters

### Color Calibration
- Max 1 accent color per section, saturation < 80%
- One palette per project — no warm/cool gray mixing
- **Color consistency lock:** Once accent chosen, use on WHOLE page
- Respect project CSS variables (--primary, --secondary, --sale, --gold, etc.)

### Layout Rules
- **Anti-center bias:** Force split/asymmetric layouts when VARIANCE > 4
- **Hero fits viewport:** Headline max 2 lines, subtext max 20 words
- **Navigation:** Single line on desktop, height cap 80px
- **Grid over Flex-Math:** Use CSS Grid, never `w-[calc(33%-1rem)]`
- **Viewport stability:** Use `min-h-[100dvh]` not `h-screen` for full-height

### Interactive States (Always Implement)
- **Loading:** Skeletal loaders matching final layout shape
- **Empty:** Beautifully composed, indicate how to populate
- **Error:** Clear, inline for forms, contextual for transient
- **Tactile feedback:** `scale-[0.98]` on `:active` for physical push feel
- **Button contrast:** WCAG AA minimum (4.5:1 body, 3:1 large text)
- **CTA wrap ban:** Button text MUST fit on one line at desktop

### Shape Consistency
Pick ONE corner-radius scale per page: all-sharp, all-soft (12-16px), or all-pill.
Document exceptions (e.g., "buttons=full, cards=16px, inputs=8px").

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG icon library)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Full loading/empty/error states implemented
- [ ] Copy self-audit: no AI-generated cute/broken copy

---

## SKILL 2: UI/UX PRO MAX (Design Intelligence)

### Design System Generator Protocol
When building any UI component:
1. Analyze product type and industry
2. Match to recommended style, palette, typography
3. Apply industry-specific anti-patterns
4. Validate against pre-delivery checklist

### Industry-Specific Rules (Marketplace/E-commerce)
- **Pattern:** Hero-Centric + Social Proof + Category Grid
- **Style:** Soft UI Evolution / Clean Modern
- **Colors:** Use project's established palette from theme.css
- **Typography:** Playfair Display (headings) + Inter (body)
- **Effects:** Smooth transitions (200-300ms), gentle hover states
- **Anti-patterns:** No bright neons, harsh animations, AI purple/pink gradients

### 99 UX Guidelines (Key Subset)
- Labels ABOVE inputs, error text BELOW
- No placeholder-as-label
- Consistent spacing: p-6 pages, p-4 cards, gap-4 grids
- Status badges with semantic color coding
- Data tables in bordered cards with hover states
- Modals with backdrop blur and escape-to-close
- KPI cards with icon + value + trend indicator
- Charts with proper legends, tooltips, and responsive sizing

### Stack-Specific Rules (React + Tailwind)
- Use Tailwind utility classes + CSS variables for theming
- Inline `style={{}}` for CSS variable references
- Responsive: mobile-first with sm/md/lg/xl breakpoints
- Component composition over monolithic components
- Proper key props in lists, memo for expensive computations

---

## SKILL 3: ECC (Enhanced Code Craftsmanship)

### 12-Step Mandatory Workflow (EVERY Code Change)

**0. Research & Reuse**
- Search codebase BEFORE writing new code
- Check existing components, utilities, patterns
- Reuse > recreate > reinvent

**1. Plan First**
- Create implementation plan before coding
- Identify affected files and components
- Consider edge cases and error states

**2. Implement (KISS / DRY / YAGNI / Immutability)**
- Keep It Simple, Stupid
- Don't Repeat Yourself — extract shared logic
- You Ain't Gonna Need It — no speculative features
- Immutable data patterns (spread operator, new objects)

**3. Error Handling**
- Comprehensive error handling, never swallow errors
- User-friendly error messages
- Graceful degradation

**4. Security Check**
- No hardcoded secrets or credentials
- Validate all inputs
- Sanitize user-provided data
- No XSS vectors in dangerouslySetInnerHTML

**5. Self Code Review**
- Quality: readable, maintainable, testable
- Security: no vulnerabilities
- Performance: no unnecessary re-renders

**6. Verification Loop**
- After every change: `npm run build` (no errors)
- Check browser console for warnings
- Verify responsive behavior

**7. Change Tracking**
- Document: WHAT changed, WHY, IMPACT, RISK
- Consider backward compatibility

**8. Naming Conventions**
- Components: PascalCase (ProductCard, ShopPage)
- Functions/variables: camelCase (addToCart, selectedCategory)
- Constants: UPPER_SNAKE_CASE (FEATURED_PRODUCTS, MOCK_ORDERS)
- Types/Interfaces: PascalCase (CartItem, OrderStatus)

**9. React/TypeScript Rules**
- Functional components with hooks only
- Proper TypeScript types (no `any`)
- Use existing state management patterns (StoreContext)
- Follow existing icon/component import patterns

**10. Architecture Awareness**
- Respect existing file structure
- Customer components in components/customer/
- Admin components in components/admin/
- Shared UI in components/ui/
- Data in data/ files

**11. Performance Awareness**
- useMemo for expensive computations
- useCallback for stable function references
- Lazy load heavy components
- No N+1 query patterns in data filtering

**12. Continuous Learning**
- Note patterns that work well
- Document decisions and trade-offs

---

## SKILL 4: SENIOR FRONTEND

### React Patterns
- Component composition with children/slots
- Custom hooks for shared logic
- Context for deep prop-drilling avoidance
- Error boundaries for crash resilience

### Performance Optimization
- Code splitting with dynamic imports
- Image optimization (lazy loading, proper sizing)
- Bundle analysis awareness
- Critical rendering path optimization

### UI Best Practices
- Semantic HTML (nav, main, section, article, footer)
- ARIA attributes for accessibility
- Keyboard navigation support
- Screen reader friendly content

---

## SKILL 5: SENIOR BACKEND

### API Design Patterns (for future backend)
- RESTful conventions with proper HTTP methods
- Consistent error response format
- Pagination for list endpoints
- Rate limiting and caching strategies

### Database Patterns (for future backend)
- Proper indexing strategy
- Query optimization awareness
- Migration planning
- Data validation at API + DB level

### Security Practices
- Input validation on every endpoint
- Parameterized queries (no SQL injection)
- Proper authentication/authorization
- CORS configuration
- Rate limiting

---

## SKILL 6: SENIOR ARCHITECT

### Architecture Patterns
- Separation of concerns (data / presentation / logic)
- Single responsibility principle per component
- Dependency inversion (interfaces over implementations)
- Module boundary respect

### System Design Principles
- Scalability awareness
- Fault tolerance planning
- Performance bottleneck identification
- Technical debt tracking

### Tech Decision Framework
- Evaluate trade-offs explicitly
- Consider maintainability + team capability
- Document architectural decisions (ADR pattern)
- Prefer proven solutions for critical paths

---

## SKILL 7: SENIOR SECURITY

### Application Security Checklist
- [ ] No sensitive data in client-side code
- [ ] All user inputs validated and sanitized
- [ ] No eval() or dangerous code execution
- [ ] CSRF protection on state-changing operations
- [ ] XSS prevention in dynamic content rendering
- [ ] Content Security Policy headers configured
- [ ] Secure cookie settings (HttpOnly, Secure, SameSite)
- [ ] Dependency vulnerability scanning

### Frontend Security
- Never trust client-side validation alone
- Sanitize HTML output (no dangerouslySetInnerHTML with user data)
- Secure token storage (never localStorage for secrets)
- Auto-complete off for sensitive fields

---

## SKILL 8: SENIOR FULLSTACK

### Project Scaffolding Standards
- Clear directory structure with logical grouping
- Consistent file naming conventions
- Shared types/interfaces in dedicated files
- Environment configuration separation

### Code Quality Standards
- TypeScript strict mode
- ESLint + Prettier configuration
- Consistent import ordering
- Meaningful variable/function names
- Self-documenting code with strategic comments

### Development Workflow
- Feature branch workflow
- Meaningful commit messages
- Code review before merge
- Automated testing in CI/CD

---

## SKILL 9: SENIOR DEVOPS

### Deployment Readiness
- Build succeeds with zero errors
- No console warnings in production build
- Environment variables properly configured
- Asset optimization (minification, compression)

### Monitoring & Observability
- Error tracking setup
- Performance monitoring awareness
- User analytics consideration
- Health check endpoints

### Infrastructure Patterns
- Containerization readiness (Dockerfile structure)
- CI/CD pipeline design
- Environment parity (dev/staging/prod)
- Rollback strategy planning

---

## PROJECT-SPECIFIC APPLICATION

### For FreshMart Marketplace:

**Always Apply:**
1. Use FreshMart brand palette from theme.css CSS variables
2. Use Playfair Display for headings, Inter for body text
3. Use Lucide React icons (already installed and used)
4. Follow existing StoreContext state management patterns
5. Maintain separation: customer/ vs admin/ components
6. Use Unsplash URLs for images (consistent with existing data)
7. Respect the mock data layer (no real API calls)
8. Use CSS variables via inline style={{}} + Tailwind for layout
9. Follow existing component patterns (ProductCard, StatusBadge, etc.)
10. Apply ECC 12-step workflow to EVERY change

**Before Any UI Change:**
1. Check design taste anti-defaults (no AI slop)
2. Validate against UI/UX Pro Max checklist
3. Verify color contrast (WCAG AA)
4. Test responsive at 375px, 768px, 1024px, 1440px
5. Implement all states: loading, empty, error, success

**Before Any Code Change:**
1. Research existing code first (ECC Step 0)
2. Plan the change (ECC Step 1)
3. Implement with KISS/DRY (ECC Step 2)
  4. Self-review (ECC Step 5)
  5. Verify build (ECC Step 6)

---

## SKILL 10: Frontend Design

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

### Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; 

---

## SKILL 11: Senior Architect (Expanded)

Complete toolkit for senior architect with modern tools and best practices.

### Quick Start

#### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Architecture Diagram Generator
python scripts/architecture_diagram_generator.py [options]

# Script 2: Project Architect
python scripts/project_architect.py [options]

# Script 3: Dependency Analyzer
python scripts/dependency_analyzer.py [options]
```

### Core Capabilities

#### 1. Architecture Diagram Generator

Automated tool for architecture diagram generator tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/architecture_diagram_generator.py <project-path> [options]
```

#### 2. Project Architect

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/project_architect.py <target-path> [--verbose]
```

#### 3. Dependency Analyzer

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/dependency_analyzer.py [arguments] [options]
```

---

## SKILL 12: Senior Backend (Expanded)

Complete toolkit for senior backend with modern tools and best practices.

### Quick Start

#### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Api Scaffolder
python scripts/api_scaffolder.py [options]

# Script 2: Database Migration Tool
python scripts/database_migration_tool.py [options]

# Script 3: Api Load Tester
python scripts/api_load_tester.py [options]
```

### Core Capabilities

#### 1. Api Scaffolder

Automated tool for api scaffolder tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/api_scaffolder.py <project-path> [options]
```

#### 2. Database Migration Tool

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/database_migration_tool.py <target-path> [--verbose]
```

#### 3. Api Load Tester

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/api_load_tester.py [arguments] [options]
```

---

## SKILL 13: Senior Frontend (Expanded)

Complete toolkit for senior frontend with modern tools and best practices.

### Quick Start

#### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Component Generator
python scripts/component_generator.py [options]

# Script 2: Bundle Analyzer
python scripts/bundle_analyzer.py [options]

# Script 3: Frontend Scaffolder
python scripts/frontend_scaffolder.py [options]
```

### Core Capabilities

#### 1. Component Generator

Automated tool for component generator tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/component_generator.py <project-path> [options]
```

#### 2. Bundle Analyzer

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/bundle_analyzer.py <target-path> [--verbose]
```

#### 3. Frontend Scaffolder

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/frontend_scaffolder.py [arguments] [options]
```

---

## SKILL 14: SEO Optimizer

Comprehensive guidance for search engine optimization across content, technical implementation, and strategic planning to improve organic search visibility and rankings.

### When to Use This Skill

Use this skill when:
- Optimizing website content for search engines
- Conducting keyword research and analysis
- Implementing technical SEO improvements
- Creating SEO-friendly meta tags and descriptions
- Auditing websites for SEO issues
- Improving Core Web Vitals and page speed
- Implementing schema markup (structured data)
- Planning content strategy for organic traffic

### SEO Fundamentals

#### 1. Keyword Research & Strategy

**Primary Keyword Selection:**
- Focus on search intent (informational, navigational, transactional, commercial)
- Balance search volume with competition
- Consider keyword difficulty and ranking potential
- Target long-tail keywords for quick wins

**Keyword Research Process:**
```text
1. Identify seed keywords from business objectives
2. Use tools to expand keyword list (Google Keyword Planner, Ahrefs, SEMrush)
3. Analyze search volume and difficulty
4. Group keywords by topic clusters
5. Map keywords to content types and pages
6. Prioritize based on potential ROI
```

**Content Optimization Formula:**
- Primary keyword: 1-2% density (natural placement)
- Include in: Title tag, H1, first paragraph, URL, meta description
- Use semantic variations and related terms
- Maintain natural readability (don't keyword stuff)

#### 2. On-Page SEO

**Title Tag Optimization:**
```html
<!-- Good: Descriptive, includes keyword, under 60 characters -->
<title>Ultimate Guide to React Hooks - Learn useEffect & useState</title>

<!-- Bad: Too long, keyword stuffing, generic -->
<title>React Hooks Guide React Hooks Tutorial React Hooks Examples Learn React</title>
```

**Best Practices:**
- Keep under 60 characters (displayed in SERPs)
- Place primary keyword near the beginning
- Include brand name if space permits
- Make compelling and click-worthy
- Unique for every page

**Meta Description:**
```html
<!-- Good: Compelling, includes keywords, call-to-action, 150-160 chars -->
<meta name="description" content="Master React Hooks with our comprehensive guide. Learn useState, useEffect, and custom hooks with practical examples. Start building better React apps today.">

<!-- Bad: Too short, no value proposition -->
<meta name="description" content="React Hooks guide and tutorial">
```

**Header Structure:**
```html
<!-- Proper hierarchy -->
<h1>Main Page Title (Primary Keyword)</h1>
  <h2>Section Heading (Related Keywords)</h2>
    <h3>Subsection</h3>
    <h3>Subsection</h3>
  <h2>Another Section</h2>
    <h3>Subsection</h3>
```

**URL Structure:**
```text
✅ Good URLs:
- /blog/react-hooks-guide
- /products/running-shoes
- /learn/javascript-async-await

❌ Bad URLs:
- /blog?p=12345
- /products/cat-1/subcat-2/item-999
- /page.php?id=abc&ref=xyz
```

**Image Optimization:**
```html
<!-- Optimized image -->
<img
  src="/images/react-hooks-diagram-800w.webp"
  alt="React Hooks lifecycle diagram showing useState and useEffect"
  width="800"
  height="600"
  loading="lazy"
/>
```

**Best Practices:**
- Use descriptive, keyword-rich alt text
- Compress images (WebP format preferred)
- Specify dimensions to prevent layout shift
- Use lazy loading for below-fold images
- Include captions when relevant

#### 3. Content Quality

**E-E-A-T Principles (Experience, Expertise, Authoritativeness, Trust):**
- Demonstrate author expertise with credentials
- Cite authoritative sources
- Keep content accurate and up-to-date
- Show real experience and original insights
- Include author bios and bylines

**Content Structure for SEO:**
```markdown
# Main Title (H1) - Primary Keyword

Brief introduction with primary keyword in first 100 words.

## What is [Topic]? (H2) - Answer core question

Comprehensive explanation with examples.

## Why [Topic] Matters (H2) - Value proposition

Benefits and use cases.

## How to [Action] (H2) - Practical guide

Step-by-step instructions with visuals.

## Best Practices (H2) - Advanced tips

Expert recommendations.

## Common Mistakes to Avoid (H2)

Troubleshooting and pitfalls.

## Conclusion

Summary and call-to-action.
```

**Content Length Guidelines:**
- Blog posts: 1,500-2,500 words (comprehensive topics)
- Product pages: 300-500 words minimum
- Category pages: 500-1,000 words
- Homepage: 500+ words

#### 4. Technical SEO

**Schema Markup (Structured Data):**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Complete Guide to React Hooks"
}
```

---

## SKILL 15: Senior Security (Expanded)

Complete toolkit for senior security with modern tools and best practices.

### Quick Start

#### Main Capabilities

This skill provides three core capabilities through automated scripts:

```bash
# Script 1: Threat Modeler
python scripts/threat_modeler.py [options]

# Script 2: Security Auditor
python scripts/security_auditor.py [options]

# Script 3: Pentest Automator
python scripts/pentest_automator.py [options]
```

### Core Capabilities

#### 1. Threat Modeler

Automated tool for threat modeler tasks.

**Features:**
- Automated scaffolding
- Best practices built-in
- Configurable templates
- Quality checks

**Usage:**
```bash
python scripts/threat_modeler.py <project-path> [options]
```

#### 2. Security Auditor

Comprehensive analysis and optimization tool.

**Features:**
- Deep analysis
- Performance metrics
- Recommendations
- Automated fixes

**Usage:**
```bash
python scripts/security_auditor.py <target-path> [--verbose]
```

#### 3. Pentest Automator

Advanced tooling for specialized tasks.

**Features:**
- Expert-level automation
- Custom configurations
- Integration ready
- Production-grade output

**Usage:**
```bash
python scripts/pentest_automator.py [arguments] [options]
```

---

## SKILL 16: Brainstorming Ideas Into Designs

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

### The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasons
