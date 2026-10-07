import * as Haptics from "expo-haptics";

export const tapLight = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} };
export const tapMedium = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {} };
export const tapHeavy = () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {} };
export const success = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} };
export const warning = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {} };
export const error = () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {} };
