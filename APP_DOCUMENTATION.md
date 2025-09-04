# Formula by Compasso - Application Documentation

## Overview

**Formula by Compasso** is a comprehensive SaaS expense management and hourly rate calculation platform designed for freelancers, consultants, and small business owners. The application helps users calculate their optimal hourly rate by analyzing their fixed costs, variable costs, and billable expenses.

## Core Business Purpose

The application solves a critical business problem: **How much should I charge per hour?** It does this by:

1. **Fixed Cost Management**: Tracking recurring monthly/yearly expenses (rent, utilities, subscriptions, etc.)
2. **Variable Cost Management**: Managing equipment depreciation and usage costs
3. **Billable Cost Calculation**: Computing hourly rates based on work patterns, taxes, fees, and desired profit margins
4. **Real-time Analytics**: Providing visual insights and breakdowns of cost structures

## Architecture Overview

Formula is built as a **monorepo** using modern web technologies with a microservices-like structure:

### Project Structure

```
formula/
├── apps/                    # Applications
│   ├── app/                 # Main SaaS application (Next.js)
│   ├── api/                 # Backend API services (Next.js API)
│   ├── web/                 # Marketing website (Next.js)
│   ├── email/               # Email template development
│   └── studio/              # Database management (Prisma Studio)
├── packages/                # Shared packages
│   ├── database/            # Database schema, repositories, caching
│   ├── design-system/       # UI components and design tokens
│   ├── email-templates/     # Transactional email templates
│   ├── feature-flags/       # Feature flag management
│   ├── next-config/         # Shared Next.js configuration
│   └── typescript-config/   # Shared TypeScript configuration
```

## Technology Stack

### Frontend Technologies

- **Framework**: Next.js 15.0.2 (React 18.3.1)
- **Language**: TypeScript 5.6.3
- **Styling**: Tailwind CSS with custom design system
- **UI Components**:
  - Radix UI (headless components)
  - Custom design system (@repo/design-system)
  - Framer Motion (animations)
  - Lucide React (icons)
- **State Management**:
  - Zustand (global state)
  - TanStack Query (server state)
  - React Hook Form (form state)
- **Drag & Drop**: @dnd-kit
- **Data Visualization**:
  - Recharts (charts)
  - ReactFlow (node-based workflows)
- **Date/Time**: date-fns

### Backend Technologies

- **Runtime**: Node.js (>=18)
- **Framework**: Next.js API Routes with Hono.js
- **Database**: PostgreSQL with Prisma ORM
- **Database Provider**: Neon (serverless PostgreSQL)
- **Caching**: Redis (ioredis)
- **WebSockets**: ws library

### Authentication & Authorization

- **Provider**: Clerk
- **Features**:
  - Social login
  - User management
  - Organization support
  - Webhook integration

### Payment Processing

- **Provider**: Stripe
- **Features**:
  - Subscription management
  - Webhook handling
  - Customer management
  - Payment processing

### Email Services

- **Provider**: Resend
- **Email Development**: React Email
- **Templates**: Custom email templates package

### Infrastructure & DevOps

- **Package Manager**: pnpm (monorepo workspace)
- **Build System**: Turbo (build orchestration)
- **Hosting**: Vercel (likely, based on analytics integration)
- **Monitoring**:
  - Sentry (error tracking)
  - BetterStack/Logtail (logging)
  - PostHog (analytics)
  - Vercel Analytics

### Development Tools

- **Code Quality**:
  - Biome (linting/formatting)
  - TypeScript strict mode
- **Testing**:
  - Vitest (unit testing)
  - Testing Library (React testing)
- **Development**:
  - Hot reloading
  - Concurrent development scripts

## Database Schema

The application uses PostgreSQL with the following main entities:

### Core Models

1. **User**

   - Authentication via Clerk
   - Plan management (free/paid)
   - User profile data

2. **ExpensesFixedCost**

   - Recurring business expenses
   - Categories: rent, utilities, subscriptions, tools, etc.
   - Monthly/yearly period tracking
   - Ranking for priority

3. **ExpensesBillableCost**

   - Work pattern configuration
   - Hourly rate calculation parameters
   - Work days, hours per day
   - Holidays, vacation, sick leave
   - Salary, taxes, fees, margin

4. **EquipmentExpense**
   - Asset depreciation tracking
   - Equipment categories
   - Purchase date, usage, lifespan
   - Automated cost allocation

## Key Features

### 1. Fixed Cost Management

- **Categories**: 14+ predefined categories (rent, utilities, internet, subscriptions, etc.)
- **Flexible Periods**: Monthly or yearly expense tracking
- **Drag & Drop**: Reorder expenses by priority
- **Real-time Calculation**: Automatic monthly cost aggregation

### 2. Variable Cost Management

- **Equipment Tracking**: Computers, monitors, peripherals, etc.
- **Depreciation Calculation**: Automatic cost allocation based on usage and lifespan
- **Category System**: 12+ equipment categories with visual indicators

### 3. Billable Rate Calculator

- **Work Pattern Analysis**:
  - Working days per week
  - Hours per day
  - Holiday allowances
  - Vacation time
  - Sick leave provisions
- **Cost Factors**:
  - Base monthly salary
  - Tax rates
  - Business fees
  - Profit margins
- **Real-time Calculation**: Live hourly rate updates

### 4. Multiple View Modes

- **Grid View**: Traditional table-based expense management
- **Node View**: Visual workflow using ReactFlow
- **Analytics View**: Charts and insights
- **Responsive Design**: Mobile-optimized interfaces

### 5. Internationalization

- **Multi-language Support**: English and Portuguese (pt-BR)
- **Currency Support**: Multiple currency formats
- **Localized Content**: Category names, labels, formatting

### 6. Analytics & Insights

- **Cost Breakdown**: Visual expense categorization
- **Trend Analysis**: Historical expense tracking
- **Break-even Analysis**: Minimum billable hours calculation
- **Export Capabilities**: Data export functionality

## External Integrations & Partners

### Authentication Partner

- **Clerk**: Complete authentication solution
  - User management
  - Social login providers
  - Organization management
  - Webhook integrations
  - User lifecycle events

### Payment Partner

- **Stripe**: Payment processing platform
  - Subscription billing
  - Customer management
  - Webhook events handling
  - Revenue tracking

### Email Partner

- **Resend**: Transactional email service
  - User notifications
  - Account updates
  - Marketing communications

### Infrastructure Partners

- **Neon**: Serverless PostgreSQL database

  - Auto-scaling database
  - Connection pooling
  - Database branching

- **Redis**: Caching layer
  - Session storage
  - Query result caching
  - Real-time data

### Analytics & Monitoring Partners

- **PostHog**: Product analytics

  - User behavior tracking
  - Feature usage analytics
  - A/B testing capabilities

- **Sentry**: Error monitoring

  - Real-time error tracking
  - Performance monitoring
  - Release tracking

- **BetterStack/Logtail**: Logging service

  - Centralized log management
  - Error alerting
  - Performance insights

- **Vercel Analytics**: Web analytics
  - Page performance
  - User engagement
  - Traffic analytics

## Development Workflow

### Local Development

```bash
# Development servers
pnpm dev              # Start all applications
pnpm dev --filter=app # Start main application only

# Database operations
pnpm migrate          # Run database migrations

# Testing
pnpm test            # Run test suites

# Building
pnpm build           # Build all applications
pnpm lint            # Code quality checks
```

### Port Configuration

- **Main App**: http://localhost:3000
- **Marketing Site**: http://localhost:3001
- **API Server**: http://localhost:3002
- **Email Development**: http://localhost:3003
- **Database Studio**: http://localhost:3005

### Environment Variables

The application requires several environment variables for external services:

- `DATABASE_URL`: PostgreSQL connection
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: Payment processing
- `CLERK_WEBHOOK_SECRET`: Authentication webhooks
- `RESEND_TOKEN` & `RESEND_FROM`: Email service
- `BETTERSTACK_API_KEY` & `BETTERSTACK_URL`: Logging service

## User Journey

### 1. Onboarding

- User signs up via Clerk authentication
- Default billable cost configuration created
- Initial setup wizard for basic parameters

### 2. Expense Setup

- Add fixed monthly/yearly expenses
- Configure equipment and depreciation
- Set work patterns and availability

### 3. Rate Calculation

- Real-time hourly rate computation
- Visual breakdown of cost components
- Scenario modeling and adjustments

### 4. Ongoing Management

- Regular expense updates
- Equipment lifecycle tracking
- Rate adjustments based on business changes

## Security & Compliance

### Data Protection

- User authentication via Clerk
- Secure API endpoints
- Input validation with Zod schemas
- Rate limiting and DDoS protection

### Privacy

- User data encryption
- GDPR compliance considerations
- Webhook signature verification
- Secure session management

## Future Considerations

### Scalability

- Monorepo architecture supports independent scaling
- Caching layer for performance optimization
- Database connection pooling
- CDN integration for static assets

### Feature Expansion

- Team collaboration features
- Advanced analytics and reporting
- Integration with accounting software
- Mobile application development

---

**Last Updated**: Generated during application analysis
**Version**: Based on current codebase state
**Maintainer**: Compasso Team
