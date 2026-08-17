export type PasswordCheck = {
  label: string;
  valid: boolean;
};

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: "Pelo menos 8 caracteres", valid: password.length >= 8 },
    { label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Uma letra minúscula", valid: /[a-z]/.test(password) },
    { label: "Um número", valid: /\d/.test(password) },
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordChecks(password).every((check) => check.valid);
}
