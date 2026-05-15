import { useState, useEffect, useRef } from 'react';
import type { UserSearchItem } from '../types/user';
import { searchUsers } from '../services/userService';

type Props = {
  isOpen: boolean;
  isSubmitting: boolean;
  apiError: string | null;
  onAdd: (userId: string) => void;
  onCancel: () => void;
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function AddEvaluatorModal({
  isOpen,
  isSubmitting,
  apiError,
  onAdd,
  onCancel,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedUserId(null);
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      searchUsers(searchQuery)
        .then(data => setSearchResults(data.users))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const selectedUser = searchResults.find(u => u.userId === selectedUserId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={isSubmitting ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-evaluator-modal-title"
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2
          id="add-evaluator-modal-title"
          className="text-lg font-bold text-[#2D2A96]"
        >
          Adicionar avaliador
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label
              htmlFor="evaluator-search"
              className="block text-sm font-medium text-gray-700"
            >
              Buscar por nome ou e-mail
            </label>
            <input
              id="evaluator-search"
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedUserId(null);
              }}
              placeholder="Digite pelo menos 2 caracteres..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2D2A96] focus:ring-1 focus:ring-[#2D2A96]"
              autoComplete="off"
            />
          </div>

          {isSearching && (
            <div className="flex justify-center py-2">
              <Spinner />
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <ul
              role="listbox"
              aria-label="Resultados da busca"
              className="max-h-48 overflow-y-auto rounded-lg border border-gray-200"
            >
              {searchResults.map(user => (
                <li
                  key={user.userId}
                  role="option"
                  aria-selected={selectedUserId === user.userId}
                  onClick={() => setSelectedUserId(user.userId)}
                  className={`cursor-pointer px-3 py-2.5 text-sm transition ${
                    selectedUserId === user.userId
                      ? 'bg-[#2D2A96]/10 text-[#2D2A96]'
                      : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{user.email}</span>
                </li>
              ))}
            </ul>
          )}

          {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              Nenhum usuário encontrado.
            </p>
          )}

          {selectedUser && (
            <p className="text-sm text-gray-600">
              Selecionado:{' '}
              <span className="font-semibold text-gray-800">{selectedUser.name}</span>
            </p>
          )}

          {apiError && (
            <p className="text-sm text-red-600" role="alert">
              {apiError}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedUserId === null || isSubmitting}
            onClick={() => selectedUserId && onAdd(selectedUserId)}
            className="flex items-center gap-2 rounded-lg border-0 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: '#FF7C6B' }}
          >
            {isSubmitting && <Spinner />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
