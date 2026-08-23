// Reserved adapter boundary for a future Huawei Health Kit integration.
// This MVP intentionally reads no device health data and sends nothing to Huawei.
window.YIJISHU_HEALTH_ADAPTER = {
  provider: "manual",
  isAvailable: () => false,
  async requestAuthorization() {
    throw new Error("华为 Health Kit 尚未接入；请继续使用手动记录。");
  },
  async readDailyMetrics() {
    return null;
  }
};
