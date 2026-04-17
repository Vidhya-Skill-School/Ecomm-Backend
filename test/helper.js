import { initializeApp } from "../src/app.js";

let appInstance = null;
let appInitialized = false;
let initPromise = null;

export async function build() {
  if (!appInitialized && !initPromise) {
    console.log("Initializing app once for all tests...");
    initPromise = (async () => {
      try {
        appInstance = await initializeApp();
        appInitialized = true;
        console.log("App initialized successfully");
      } catch (error) {
        console.error("Failed to initialize app:", error);
        throw error;
      }
    })();
  }

  if (initPromise) {
    await initPromise;
  }

  return {
    server: appInstance,
    inject: async (options) => {
      if (!appInstance) {
        throw new Error("App not initialized");
      }
      try {
        const response = await appInstance.inject(options);
        return {
          statusCode: response.statusCode,
          body: response.body,
          headers: response.headers,
        };
      } catch (error) {
        console.error("Inject error:", error);
        throw error;
      }
    },
    close: async () => {
      // Keep app running for all tests
    },
  };
}

export const generateTestEmail = () =>
  `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

export const createTestUser = async (app, overrides = {}) => {
  const email = generateTestEmail();
  const userData = {
    email,
    name: "Test User",
    phone: "1234567890",
    password: "password123",
    ...overrides,
  };

  console.log(`Creating test user with email: ${email}`);

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/signup",
    payload: userData,
  });

  if (response.statusCode !== 201) {
    console.error("Create user failed:", response.statusCode, response.body);
    throw new Error(`Failed to create user: ${response.body}`);
  }

  const body = JSON.parse(response.body);
  const user = body.data || body.user; // Support both for safety during transition
  return { user, password: userData.password };
};

export const getAuthToken = async (app, email, password) => {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/signin",
    payload: { email, password },
  });

  if (response.statusCode !== 200) {
    console.error("Get auth token failed:", response.statusCode, response.body);
    throw new Error(`Failed to get auth token: ${response.body}`);
  }

  const body = JSON.parse(response.body);
  return body.accessToken;
};

export const createTestProduct = async (app, accessToken, overrides = {}) => {
  const productData = {
    title: `Test_Product_${Date.now()}`,
    description: "Test Description",
    price: 99.99,
    category: "Test Category",
    brand: "Test Brand",
    rating: 4.5,
    stock: 100,
    ...overrides,
  };

  const response = await app.inject({
    method: "POST",
    url: "/api/v1/products",
    headers: { authorization: `Bearer ${accessToken}` },
    payload: productData,
  });

  if (response.statusCode !== 201) {
    console.error("Create product failed:", response.statusCode, response.body);
    throw new Error(`Failed to create product: ${response.body}`);
  }

  const body = JSON.parse(response.body);
  return body.data;
};
