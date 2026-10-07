import { Redirect } from "expo-router";
// Delegate to scan-barcode in customer mode
export default function ScanCustomer() {
  return <Redirect href="/(staff)/scan-barcode?mode=customer" />;
}
