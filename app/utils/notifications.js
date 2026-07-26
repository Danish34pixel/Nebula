import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function getNotificationPermissionsAsync() {
  if (!Device.isDevice) {
    return { granted: false, status: "device" };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") {
    return { granted: true, status: existingStatus };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return { granted: status === "granted", status };
}

export async function registerForPushNotificationsAsync() {
  const { granted, status } = await getNotificationPermissionsAsync();

  if (!granted) {
    throw new Error(
      status === "device"
        ? "Push notifications require a physical device."
        : "Permission for notifications not granted.",
    );
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function setNotificationChannel() {
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}
