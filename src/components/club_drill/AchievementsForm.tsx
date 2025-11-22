"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormRegister } from "react-hook-form";
import { FormValues } from "@/types/club-detls";

interface Props {
    register: UseFormRegister<FormValues>;
    onSubmit: () => void;
    onReset: () => void;
}

export default function AchievementsForm({ register, onSubmit, onReset }: Props) {
    return (
        <form onSubmit={onSubmit}>
            <p className="mt-4 font-bold text-gray-700">
                <u>Spl Achievement</u> (Cane Orderly, Samman Toli, Nishan Toli, Best in Drill)
            </p>

            <div className="mt-3 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                        <div className="w-6 text-sm">{i + 1}.</div>
                        <Input {...register(`splAchievementsList.${i}` as const)} />
                    </div>
                ))}
            </div>

            <div className="flex justify-center gap-4 mt-6">
                <Button type="submit" className="bg-blue-600 text-white">
                    Save Achievements
                </Button>
                <Button type="button" variant="outline" onClick={onReset}>
                    Reset Achievements
                </Button>
            </div>
        </form>
    );
}
