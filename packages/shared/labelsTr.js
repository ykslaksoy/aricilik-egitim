/** Geriye dönük uyumluluk — yeni kod packages/shared/i18n kullanır */

const i18n = require("./i18n");

module.exports = {
  ALERT_TYPE_TR: i18n.pack("tr").alertType,
  HIVE_STATUS_TR: i18n.pack("tr").hiveStatus,
  FAULT_TR: i18n.pack("tr").fault,
  ROLE_TR: i18n.pack("tr").role,
  alertTypeTr: i18n.alertTypeTr,
  hiveStatusTr: i18n.hiveStatusTr,
  faultTr: i18n.faultTr,
  roleTr: i18n.roleTr,
  i18n,
};
