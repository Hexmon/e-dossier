// components/dossier/OfficerCadetForm.tsx  (Tabs-in-component version)
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { OfficerCadetForm } from "@/types/dossierSnap";

interface Props {
    initialValues?: OfficerCadetForm | null;
    onSave?: (data: OfficerCadetForm) => void; // optional, since component also shows preview
}

export default function OfficerCadetFormComponent({ initialValues = null, onSave }: Props) {
    const form = useForm<OfficerCadetForm>({
        defaultValues: {
            arrivalPhoto: null,
            departurePhoto: null,
            tesNo: "",
            name: "",
            course: "",
            pi: "",
            dtOfArr: "",
            relegated: "",
            withdrawnOn: "",
            dtOfPassingOut: "",
            icNo: "",
            orderOfMerit: "",
            regtArm: "",
            postedAtt: "",
            ...initialValues,
        },
    });

    const { register, handleSubmit, reset, watch } = form;
    const [savedData, setSavedData] = useState<OfficerCadetForm | null>(initialValues ?? null);

    const arrivalPhoto = watch("arrivalPhoto");
    const departurePhoto = watch("departurePhoto");

    useEffect(() => {
        // keep preview live while typing / file selection if you want:
        // setSavedData(prev => ({ ...prev, arrivalPhoto, departurePhoto }));
        // but here we'll only update preview on Save
        return () => { /* cleanup if needed */ };
    }, [arrivalPhoto, departurePhoto]);

    const onSubmit = (data: OfficerCadetForm) => {
        const { name = "" } = data;
        if (!name.trim()) {
            toast.error("Please provide the cadet name");
            return;
        }
        setSavedData(data);
        onSave?.(data);
        toast.success("Saved locally for preview");
        reset();
    };

    return (
        <div>
            <Tabs defaultValue="form">
                <TabsList className="mb-4">
                    <TabsTrigger value="form">Fill Form</TabsTrigger>
                    <TabsTrigger value="preview">Preview Data</TabsTrigger>
                </TabsList>

                <div className="w-full">
                    <TabsContent value="form">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Form contents (same as before) */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col items-center border p-4 rounded-lg">
                                    <Label>Arrival (Civil Dress)</Label>
                                    <Input type="file" accept="image/*" {...register("arrivalPhoto")} />
                                </div>
                                <div className="flex flex-col items-center border p-4 rounded-lg">
                                    <Label>Departure (Uniform)</Label>
                                    <Input type="file" accept="image/*" {...register("departurePhoto")} />
                                </div>
                            </div>

                            {/* rest of fields... */}
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="ml-1 mb-1">TES No</Label><Input {...register("tesNo")} /></div>
                                <div><Label className="ml-1 mb-1">Name</Label><Input {...register("name")} /></div>
                                <div><Label className="ml-1 mb-1">Course</Label><Input {...register("course")} /></div>
                                <div><Label className="ml-1 mb-1">PI</Label><Input {...register("pi")} /></div>
                                <div><Label className="ml-1 mb-1">Date of Arrival</Label><Input type="date" {...register("dtOfArr")} /></div>
                                <div><Label className="ml-1 mb-1">Relegated to Course & Date</Label><Input {...register("relegated")} /></div>
                                <div><Label className="ml-1 mb-1">Withdrawn On</Label><Input type="date" {...register("withdrawnOn")} /></div>
                            </div>

                            <h3 className="text-lg font-semibold bg-blue-100 px-4 py-1 rounded-2xl">Commissioning Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="ml-1 mb-1">Date of Passing Out</Label><Input type="date" {...register("dtOfPassingOut")} /></div>
                                <div><Label className="ml-1 mb-1">IC No</Label><Input {...register("icNo")} /></div>
                                <div><Label className="ml-1 mb-1">Order of Merit</Label><Input {...register("orderOfMerit")} /></div>
                                <div><Label className="ml-1 mb-1">Regt/Arm Allotted</Label><Input {...register("regtArm")} /></div>
                                <div className="col-span-2"><Label className="ml-1 mb-1">Posted/Attached To</Label><Input {...register("postedAtt")} /></div>
                            </div>

                            <div className="flex justify-center mt-6 gap-4">
                                <Button type="submit" className="w-40">Save</Button>
                                <Button type="button" variant="outline" className="w-40" onClick={() => reset()}>Reset</Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="preview">
                        <div className="p-4 bg-gray-50 rounded">
                            {!savedData ? (
                                <p className="text-gray-500 italic text-center">No data saved yet. Fill and save the form first.</p>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Preview</h3>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        {savedData.arrivalPhoto?.[0] ? (
                                            <div className="flex flex-col items-center">
                                                <img src={URL.createObjectURL(savedData.arrivalPhoto[0])} alt="Arrival" className="h-32 w-32 object-cover rounded border" />
                                                <p className="mt-2 text-sm text-gray-600">Arrival (Civil Dress)</p>
                                            </div>
                                        ) : <p className="text-gray-500 italic">No arrival photo</p>}

                                        {savedData.departurePhoto?.[0] ? (
                                            <div className="flex flex-col items-center">
                                                <img src={URL.createObjectURL(savedData.departurePhoto[0])} alt="Departure" className="h-32 w-32 object-cover rounded border" />
                                                <p className="mt-2 text-sm text-gray-600">Departure (Uniform)</p>
                                            </div>
                                        ) : <p className="text-gray-500 italic">No departure photo</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {Object.entries({
                                            Name: savedData.name,
                                            "TES No": savedData.tesNo,
                                            Course: savedData.course,
                                            PI: savedData.pi,
                                            "Date of Arrival": savedData.dtOfArr,
                                            Relegated: savedData.relegated,
                                            "Withdrawn On": savedData.withdrawnOn,
                                            "Date of Passing Out": savedData.dtOfPassingOut,
                                            "IC No": savedData.icNo,
                                            "Order of Merit": savedData.orderOfMerit,
                                            "Regt/Arm": savedData.regtArm,
                                            "Posted/Attached To": savedData.postedAtt,
                                        }).map(([label, value]) => (
                                            <p key={label}><strong>{label}:</strong> {value || "-"}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
