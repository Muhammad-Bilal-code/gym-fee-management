# ADR-001: Gym Management SaaS Enhancement Roadmap

## Status
Accepted

## Context
The current Gym Fee Management application is in its initial/beginner state with basic member management and fee tracking features. To transform it into a production-grade Gym Management SaaS, a comprehensive enhancement plan is required.

## Decision
Implement a phased approach to systematically build out the SaaS features, starting from foundational infrastructure and progressing through advanced features.

## Enhancement Roadmap

### Phase 1: Foundation (Core SaaS Infrastructure)
**Priority: HIGH**
- [ ] Implement multi-tenant gym/branch system with RLS (Row Level Security)
- [ ] Add role-based access control (Admin, Staff, Trainer, Front Desk)
- [ ] Create gym organization management (settings, branding, hours)
- [ ] Implement audit logging system for all actions

**Key Technologies:**
- Supabase RLS policies for multi-tenancy
- Custom user_roles table with permissions
- Organization/Branch entity modeling

---

### Phase 2: Member Management Pro
**Priority: HIGH**
- [ ] Membership packages system (Gold, Silver, Platinum with durations)
- [ ] Member health profiles (weight, BMI, measurements tracking)
- [ ] Member document uploads (ID, agreements, medical forms)
- [ ] QR code generation for member check-in
- [ ] Member progress timeline with photos

**Database Schema Updates:**
```sql
-- Membership packages
CREATE TABLE membership_packages (
  id UUID PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id),
  name TEXT NOT NULL,
  duration_months INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  benefits JSONB,
  max_visits_per_month INT
);

-- Member health profiles
CREATE TABLE member_health_profiles (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  bmi DECIMAL(5,2),
  measurements JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member documents
CREATE TABLE member_documents (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Phase 3: Attendance & Check-in System
**Priority: HIGH**
- [ ] Real-time attendance tracking with QR scan
- [ ] Kiosk mode for self-service check-in
- [ ] Attendance analytics and peak hour analysis
- [ ] Daily/weekly/monthly attendance reports

**Features:**
- Camera-based QR code scanning
- Tablet/kiosk interface for check-in
- Attendance heatmap visualization
- Automatic check-out detection

---

### Phase 4: Payments & Billing
**Priority: HIGH**
- [ ] Stripe payment gateway integration
- [ ] Invoice generation and PDF export
- [ ] Multiple payment methods (cash, card, UPI, bank transfer)
- [ ] Payment reminders via email/SMS
- [ ] Revenue reports and P&L dashboard

**Payment Flow:**
1. Fee becomes due (based on membership start date)
2. Automated reminder 3 days before due date
3. Multiple payment options
4. Instant invoice generation
5. Auto-receipt via email

---

### Phase 5: Trainer & Class Management
**Priority: HIGH**
- [ ] Trainer profiles with specialties and availability
- [ ] Class schedule management (Yoga, Zumba, Spinning)
- [ ] Class booking system with capacity limits
- [ ] Waitlist handling for full classes
- [ ] Trainer performance and client tracking

**Class Management:**
- Recurring class schedules
- One-time special classes
- Capacity enforcement
- Cancellation policies
- Trainer assignment and availability

---

### Phase 6: Inventory & Equipment
**Priority: MEDIUM**
- [ ] Equipment catalog management
- [ ] Equipment maintenance scheduling
- [ ] Consumables inventory (protein supplements, towels, etc.)
- [ ] Purchase order tracking
- [ ] Equipment usage analytics

---

### Phase 7: Analytics & Reporting
**Priority: MEDIUM**
- [ ] Real-time dashboard with KPIs
- [ ] Member acquisition and retention analytics
- [ ] Revenue forecasting
- [ ] Custom report builder
- [ ] Export to CSV/Excel/PDF

**Key Metrics:**
- Active members count
- Monthly recurring revenue (MRR)
- Churn rate
- Average revenue per member
- Class attendance rates
- Peak hours identification

---

### Phase 8: Communication & Notifications
**Priority: MEDIUM**
- [ ] Email templates and campaigns
- [ ] SMS notifications (Twilio integration)
- [ ] Push notifications for mobile
- [ ] Birthday greetings
- [ ] Promotional announcements

**Notification Types:**
- Fee reminders
- Class confirmations
- Check-in confirmations
- Special offers
- Birthday wishes
- Membership renewal alerts

---

### Phase 9: Mobile App
**Priority: LOW**
- [ ] React Native/Expo mobile application
- [ ] Member self-service features
- [ ] Push notifications
- [ ] Offline mode support
- [ ] QR code wallet integration

**Mobile Features:**
- View membership status
- Book classes
- Check attendance history
- Make payments
- View progress photos
- Receive notifications

---

### Phase 10: SaaS Features
**Priority: LOW**
- [ ] Subscription plans for gym owners
- [ ] Usage-based pricing tiers
- [ ] White-label branding options
- [ ] API for third-party integrations
- [ ] Webhooks for automation

**Pricing Tiers:**
- Starter: Up to 50 members
- Growth: Up to 500 members
- Professional: Up to 5,000 members
- Enterprise: Unlimited members

---

## Implementation Order
Recommended sequence:
1. **Phase 1** (Foundation) - Critical for all other features
2. **Phase 2** (Member Management Pro) - Enhances existing features
3. **Phase 3** (Attendance) - Core gym functionality
4. **Phase 4** (Payments) - Revenue generation
5. **Phase 5** (Trainer/Classes) - Expand services
6. **Phase 7** (Analytics) - Data insights
7. **Phase 8** (Communication) - Member engagement
8. **Phase 6** (Inventory) - Operational efficiency
9. **Phase 10** (SaaS) - Business model
10. **Phase 9** (Mobile) - Accessibility

## Technology Additions
- **QR Code**: `qrcode.react` or `react-qr-code`
- **PDF Generation**: `jsPDF` or `@react-pdf/renderer`
- **Charts**: `recharts` or `chart.js`
- **Payments**: `@stripe/stripe-js`, `stripe` (Node)
- **Email**: Supabase Auth emails or Resend
- **SMS**: Twilio SDK
- **Date/Time**: `date-fns` or `dayjs`
- **Forms**: `react-hook-form`, `zod`
- **State**: Zustand or Redux Toolkit (if needed)
- **Realtime**: Supabase Realtime subscriptions

## Database Schema Changes Needed
- `gyms` table (multi-tenancy)
- `branches` table (per gym locations)
- `user_roles` table (role assignments)
- `membership_packages` table
- `member_health_profiles` table
- `member_documents` table
- `attendances` table (check-in/out records)
- `trainers` table
- `classes` table
- `class_bookings` table
- `equipments` table
- `inventory` table
- `notifications` table
- `audit_logs` table

## Consequences
- **Positive**: Comprehensive feature set, competitive SaaS product
- **Negative**: Significant development time, increased complexity
- **Mitigation**: Phased approach allows iterative development and testing

## Alternatives Considered
1. Build minimal features only - Rejected due to competitive requirements
2. Use existing gym management SaaS API - Rejected for full control and customization
3. Start with mobile-first - Rejected as web platform provides more flexibility

## References
- Current codebase: `src/`
- Supabase documentation: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
