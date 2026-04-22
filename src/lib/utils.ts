import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { auth } from "../firebase";
import { OperationType, FirestoreErrorInfo } from "../types";
export { OperationType };
export type { FirestoreErrorInfo };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error?.message || String(error),
    authInfo: {
      userId: auth.currentUser?.uid || "No UID",
      email: auth.currentUser?.email || "No Email",
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || "",
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || "",
        email: provider.email || "",
        photoUrl: provider.photoURL || ""
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  let userMessage = "Database Error: ";
  const errorCode = error?.code || "";
  const errorMessage = error?.message || "";

  if (errorCode === "permission-denied" || errorMessage.includes("permission-denied") || errorMessage.includes("Missing or insufficient permissions")) {
    userMessage += "Permission Denied. You don't have the required role (Admin/Editor) or the data format is invalid.";
  } else if (errorCode === "quota-exceeded" || errorMessage.includes("quota-exceeded")) {
    userMessage += "Quota Exceeded.";
  } else if (errorCode === "unavailable" || errorMessage.includes("unavailable")) {
    userMessage += "Service temporarily unavailable. Please check your connection.";
  } else {
    userMessage += errorMessage || String(error);
  }
  
  toast.error(userMessage);
}

export function stripHtml(html: string) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function handleStorageError(error: any, path: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    path
  }
  console.error('Storage Error: ', JSON.stringify(errInfo));
  
  if (error.code === 'storage/unauthorized') {
    toast.error("Permission Denied: You do not have permission to upload to this folder. Please check your Firebase Storage rules.");
  } else if (error.code === 'storage/quota-exceeded') {
    toast.error("Quota Exceeded: Your Firebase Storage quota has been reached.");
  } else if (error.code === 'storage/retry-limit-exceeded') {
    toast.error("Upload Timed Out: The upload took too long. Please check your internet connection.");
  } else if (error.code === 'storage/invalid-url') {
    toast.error("Invalid Storage Configuration: The storage bucket URL is incorrect.");
  } else if (error.message?.includes('the client is offline')) {
    toast.error("Network Error: You appear to be offline or the Firebase Storage service is unreachable.");
  } else {
    toast.error("Storage Error: " + errInfo.error);
  }
}
