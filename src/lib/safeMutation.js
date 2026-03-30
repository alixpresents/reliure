/**
 * Wrapper pour les mutations Supabase avec optimistic update.
 * Gère le try-catch, le revert en cas d'erreur, et le feedback console.
 *
 * @param {Object} options
 * @param {Function} options.mutate - fonction async qui fait la requête Supabase. Doit throw si erreur.
 * @param {Function} [options.onOptimistic] - callback pour l'update optimiste (avant l'await)
 * @param {Function} [options.onRevert] - callback pour revert si la mutation échoue
 * @param {Function} [options.onSuccess] - callback après succès (reçoit data)
 * @param {Function} [options.onError] - callback après erreur (reçoit error). Si absent, console.error.
 * @param {string} [options.errorMessage] - message d'erreur pour le log
 */
export async function safeMutation({ mutate, onOptimistic, onRevert, onSuccess, onError, errorMessage = 'Mutation failed' }) {
  if (onOptimistic) onOptimistic();
  try {
    const result = await mutate();
    if (onSuccess) onSuccess(result);
    return result;
  } catch (err) {
    console.error(errorMessage, err);
    if (onRevert) onRevert();
    if (onError) onError(err);
    return null;
  }
}

export async function unwrapSupabase(result, context = '') {
  const { data, error } = await result;
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}
