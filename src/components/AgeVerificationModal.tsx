import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function AgeVerificationModal() {
  const [birthYear, setBirthYear] = useState("");
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const setAgeVerification = useMutation(api.userPreferences.setAgeVerification);

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const year = parseInt(birthYear);
    if (isNaN(year) || year < minYear || year > maxYear) {
      setError(`올바른 출생 연도를 입력해주세요 (${minYear}-${maxYear})`);
      return;
    }

    if (isAdult === null) {
      setError("연령 확인을 선택해주세요");
      return;
    }

    const age = currentYear - year;
    
    // Validate age matches selection
    if (isAdult && age < 18) {
      setError("만 18세 미만입니다. 정확한 정보를 입력해주세요.");
      return;
    }

    try {
      await setAgeVerification({ birthYear: year, isAdult });
    } catch (err) {
      setError("설정 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">연령 확인</h2>
          <p className="text-gray-300 text-sm">
            일부 콘텐츠는 연령 제한이 있을 수 있습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">출생 연도</label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="예: 2000"
              min={minYear}
              max={maxYear}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-red-500 text-white"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">연령 확인</label>
            
            <button
              type="button"
              onClick={() => setIsAdult(true)}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                isAdult === true
                  ? "bg-red-600 border-red-500 text-white"
                  : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">만 18세 이상입니다</span>
                {isAdult === true && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-left mt-1 opacity-75">
                성인 콘텐츠를 선택적으로 시청할 수 있습니다
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsAdult(false)}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                isAdult === false
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">만 18세 미만입니다</span>
                {isAdult === false && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-left mt-1 opacity-75">
                성인 콘텐츠가 자동으로 건너뛰어집니다
              </p>
            </button>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!birthYear || isAdult === null}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            확인
          </button>

          <p className="text-xs text-gray-400 text-center">
            만 18세가 되면 설정이 자동으로 변경됩니다
          </p>
        </form>
      </div>
    </div>
  );
}
