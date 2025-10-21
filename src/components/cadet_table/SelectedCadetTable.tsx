import { Cadet } from "@/types/cadet";

type CadetTableProps = {
  selectedCadet: Cadet | null;
};

export default function SelectedCadetTable({ selectedCadet }: CadetTableProps) {
  if (!selectedCadet) return null;

  return (
    <div className="sticky top-16 z-50 bg-white border border-gray-200 shadow-sm min-w-full mb-4 rounded-lg overflow-hidden">
      <table className="min-w-full text-sm text-gray-700 border-collapse">
        <thead className="bg-blue-100 text-blue-700">
          <tr>
            <th className="px-6 py-3 text-center font-semibold border border-gray-300">
              Selected Cadet
            </th>
            <th className="px-6 py-3 text-center font-semibold border border-gray-300">
              Course
            </th>
            <th className="px-6 py-3 text-center font-semibold border border-gray-300">
              OC Number
            </th>
          </tr>
        </thead>
        <tbody className="bg-white text-center">
          <tr>
            <td className="px-6 py-3 border border-gray-300">{selectedCadet.name}</td>
            <td className="px-6 py-3 border border-gray-300">{selectedCadet.course}</td>
            <td className="px-6 py-3 border border-gray-300">{selectedCadet.ocNumber}</td>
          </tr>
        </tbody>
      </table>
    </div>

  );
}
