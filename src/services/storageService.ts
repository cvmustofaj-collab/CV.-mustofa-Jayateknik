import { WorkOrder, Customer, InventoryItem } from '../types/rewinding';
import { INITIAL_WORK_ORDERS, INITIAL_CUSTOMERS, INITIAL_INVENTORY } from '../data/initialData';

const STORAGE_KEYS = {
  WORK_ORDERS: 'cmjt_rewinding_work_orders_v1',
  CUSTOMERS: 'cmjt_rewinding_customers_v1',
  INVENTORY: 'cmjt_rewinding_inventory_v1',
};

const isGasEnvironment = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.google?.script?.run);

const syncToGasSheet = (fnName: string, payload?: unknown) => {
  if (!isGasEnvironment() || !window.google?.script?.run) return;
  try {
    const runner = window.google.script.run.withFailureHandler((err: Error) => {
      console.error(`GAS ${fnName} sync error:`, err);
    });
    if (payload !== undefined) {
      runner[fnName](payload);
    } else {
      runner[fnName]();
    }
  } catch (err) {
    console.error(`Failed calling GAS ${fnName}:`, err);
  }
};

export const storageService = {
  isGasEnvironment,

  loadAllFromGas(): Promise<{
    orders: WorkOrder[];
    customers: Customer[];
    inventory: InventoryItem[];
  } | null> {
    if (!isGasEnvironment() || !window.google?.script?.run) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      window.google!.script!.run!
        .withSuccessHandler((res: any) => {
          if (res && Array.isArray(res.orders)) {
            localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(res.orders));
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(res.customers || []));
            localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(res.inventory || []));
            resolve({
              orders: res.orders,
              customers: res.customers || [],
              inventory: res.inventory || [],
            });
          } else {
            resolve(null);
          }
        })
        .withFailureHandler(() => resolve(null))
        .getAllWorkshopData();
    });
  },

  getWorkOrders(): WorkOrder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORK_ORDERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(INITIAL_WORK_ORDERS));
        return INITIAL_WORK_ORDERS;
      }
      const parsed: WorkOrder[] = JSON.parse(data);
      // Merge any missing initial seed orders if user has older cache
      const existingIds = new Set(parsed.map((o) => o.id));
      const missing = INITIAL_WORK_ORDERS.filter((o) => !existingIds.has(o.id));
      if (missing.length > 0) {
        const merged = [...parsed, ...missing];
        localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch {
      return INITIAL_WORK_ORDERS;
    }
  },

  saveWorkOrders(orders: WorkOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(orders));
      syncToGasSheet('saveWorkOrders', orders);
    } catch (e) {
      console.error('Failed to save work orders to localStorage', e);
    }
  },

  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
        return INITIAL_CUSTOMERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CUSTOMERS;
    }
  },

  saveCustomers(customers: Customer[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      syncToGasSheet('saveCustomers', customers);
    } catch (e) {
      console.error('Failed to save customers to localStorage', e);
    }
  },

  getInventory(): InventoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
        return INITIAL_INVENTORY;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_INVENTORY;
    }
  },

  saveInventory(inventory: InventoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      syncToGasSheet('saveInventory', inventory);
    } catch (e) {
      console.error('Failed to save inventory to localStorage', e);
    }
  },

  resetToDefaultData(): { orders: WorkOrder[]; customers: Customer[]; inventory: InventoryItem[] } {
    localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(INITIAL_WORK_ORDERS));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
    syncToGasSheet('resetWorkshopDatabase');
    return {
      orders: INITIAL_WORK_ORDERS,
      customers: INITIAL_CUSTOMERS,
      inventory: INITIAL_INVENTORY,
    };
  },

  exportAllDataAsJSON(): string {
    const backup = {
      app: 'CV. MUSTOFA JAYA TEKNIK - REWINDING MANAGEMENT',
      exportedAt: new Date().toISOString(),
      workOrders: this.getWorkOrders(),
      customers: this.getCustomers(),
      inventory: this.getInventory(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importDataFromJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.workOrders) && Array.isArray(parsed.customers) && Array.isArray(parsed.inventory)) {
        this.saveWorkOrders(parsed.workOrders);
        this.saveCustomers(parsed.customers);
        this.saveInventory(parsed.inventory);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};
