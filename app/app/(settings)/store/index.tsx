import { Redirect } from 'expo-router';

/** `/store` → your stores list. */
export default function StoreIndexRedirect() {
  return <Redirect href="/(settings)/stores" />;
}
