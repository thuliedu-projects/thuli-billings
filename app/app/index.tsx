import { Redirect } from 'expo-router';

/** Stage UI: land on auth; real gate after models. */
export default function Index() {
  return <Redirect href="/(auth)" />;
}
