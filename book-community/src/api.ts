export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
//Ez a kód a segédfüggvény, API-tól érkező fájlokat dolgozza fel JSON objektummá