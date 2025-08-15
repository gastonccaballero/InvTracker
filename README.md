# InvTracker - Inventory & Event Management System

A comprehensive inventory and event management system with PostgreSQL database backend.

## Features

- **Inventory Management**: Track items, SKUs, quantities, pricing, and locations
- **Event Management**: Manage events, clients, dates, and locations
- **Checkout System**: Process rentals with automatic inventory tracking
- **Returns Management**: Track item returns and update availability
- **Reporting**: Generate invoices and view activity logs
- **Settings**: Configure business information and tax rates

## Prerequisites

- **PostgreSQL** (already installed on your system)
- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)

## Database Setup

1. **Create the database:**
   ```sql
   CREATE DATABASE InvTracker;
   ```

2. **Run the schema setup:**
   - Connect to your `InvTracker` database
   - Execute the SQL commands from `setup_commands.sql`

## Application Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure database connection:**
   - Edit `config.env` with your PostgreSQL credentials
   - The default assumes no password for local PostgreSQL

3. **Start the application:**
   ```bash
   ./start.sh
   ```
   
   Or manually:
   ```bash
   npm start
   ```

## Usage

1. **Access the application:**
   - Open your browser to `http://localhost:3000`
   - The application will load with a modern, responsive interface

2. **Initial setup:**
   - Go to Settings to configure your business information
   - Add inventory items
   - Create events
   - Start processing checkouts

## API Endpoints

The backend provides RESTful API endpoints:

- `GET /api/settings` - Get business settings
- `PUT /api/settings` - Update business settings
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `GET /api/checkouts` - Get all checkouts
- `POST /api/checkouts` - Create new checkout
- `POST /api/checkouts/:id/returns` - Process returns
- `GET /api/activity` - Get activity log
- `GET /api/stats` - Get system statistics

## Database Schema

The application uses these main tables:

- **settings** - Business configuration
- **inventory** - Inventory items with quantities and pricing
- **events** - Event information and client details
- **checkouts** - Main checkout records
- **checkout_items** - Individual items in checkouts
- **returns** - Return tracking
- **activity** - Audit trail

## Features

### Inventory Management
- Add/edit/delete inventory items
- Track SKU, name, category, location
- Monitor quantities (total vs available)
- Set safety stock levels
- Price tracking (cost vs rental price)
- Tag system for categorization

### Event Management
- Create and manage events
- Track client information
- Set event dates and locations
- Status tracking (planned, active, done, cancelled)

### Checkout System
- Create checkouts linked to events
- Automatic inventory quantity updates
- Price calculations with tax
- Due date tracking

### Returns Processing
- Process partial or complete returns
- Automatic inventory restoration
- Return date tracking

### Reporting
- Activity logs
- System statistics
- Invoice generation
- Print-friendly layouts

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `brew services start postgresql`
- Check your database credentials in `config.env`
- Verify the database name matches exactly (case-sensitive)

### Port Already in Use
- Change the port in `config.env` or use a different port
- Kill existing processes: `lsof -ti:3000 | xargs kill -9`

## License

MIT License - feel free to use and modify as needed.
