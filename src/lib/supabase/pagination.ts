/** Read bounded pages in a stable order supplied by the caller.
 * Continue until an empty page: the server may cap pages below the requested size.
 * Keep RLS and all filters on every request; never use a service client here.
 */
export async function readPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, pageSize = 250): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Invalid page size");
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

export function pageNumber(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1;
}
