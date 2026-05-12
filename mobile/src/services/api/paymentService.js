// Payment service removed as per request to remove payment data from the app
export const paymentService = {
    // No-op
    getPaymentHistory: async () => ({ data: { payments: [] } }),
    makePayment: async () => ({ success: true }),
};
