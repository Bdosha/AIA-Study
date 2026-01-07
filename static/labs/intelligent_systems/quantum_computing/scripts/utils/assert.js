/**
 * Утилита проверки утверждений (assert), с сообщениями об ошибках.
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
