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
