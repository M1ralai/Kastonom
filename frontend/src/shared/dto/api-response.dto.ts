/**
 * Altın kural: Tüm API responselar bu formatta olur.
 * { data: T, message: string }
 */
export interface ApiResponse<T> {
  data: T;
  message: string;
}
