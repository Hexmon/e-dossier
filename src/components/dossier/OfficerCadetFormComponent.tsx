"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { OfficerCadetForm } from "@/types/dossierSnap";
import { useDossierSnapshot } from "@/hooks/useDossierSnapshot";

interface Props {
    ocId: string;
}

export default function OfficerCadetFormComponent({ ocId }: Props) {
    const [isEditMode, setIsEditMode] = useState(false);

    const { dossierSnapshot, saveSnapshot, loadingSnapshot } = useDossierSnapshot(ocId);

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
        },
    });

    const { register, handleSubmit, reset, watch } = form;

    /* 💾 Auto-save */
    useEffect(() => {
        if (dossierSnapshot) {
            reset({
                tesNo: dossierSnapshot.tesNo || "",
                name: dossierSnapshot.name || "",
                course: dossierSnapshot.course || "",
                pi: dossierSnapshot.pi || "",
                dtOfArr: dossierSnapshot.dtOfArr || "",
                relegated: dossierSnapshot.relegated || "",
                withdrawnOn: dossierSnapshot.withdrawnOn || "",
                dtOfPassingOut: dossierSnapshot.dtOfPassingOut || "",
                icNo: dossierSnapshot.icNo || "",
                orderOfMerit: dossierSnapshot.orderOfMerit || "",
                regtArm: dossierSnapshot.regtArm || "",
                postedAtt: dossierSnapshot.postedAtt || "",
            });
        }
    }, [dossierSnapshot, reset]);

    const currentFormValues = watch();

    const onSubmit = async (data: OfficerCadetForm) => {
        const { name = "" } = data;
        if (!name.trim()) {
            toast.error("Please provide the cadet name");
            return;
        }

        // Create FormData to include files and text fields
        const formData = new FormData();

        // Append text fields
        formData.append('tesNo', data.tesNo);
        formData.append('name', data.name);
        formData.append('course', data.course);
        formData.append('pi', data.pi);
        formData.append('dtOfArr', data.dtOfArr);
        formData.append('relegated', data.relegated);
        formData.append('withdrawnOn', data.withdrawnOn);
        formData.append('dtOfPassingOut', data.dtOfPassingOut);
        formData.append('icNo', data.icNo);
        formData.append('orderOfMerit', data.orderOfMerit);
        formData.append('regtArm', data.regtArm);
        formData.append('postedAtt', data.postedAtt);

        // Append files if present
        if (data.arrivalPhoto instanceof FileList && data.arrivalPhoto[0]) {
            formData.append('arrivalPhoto', data.arrivalPhoto[0]);
        }
        if (data.departurePhoto instanceof FileList && data.departurePhoto[0]) {
            formData.append('departurePhoto', data.departurePhoto[0]);
        }

        await saveSnapshot(formData);
        setIsEditMode(false);
    };

    const handleReset = () => {
        if (!confirm("Clear all officer cadet details?")) return;

    const handleCancel = () => {
        setIsEditMode(false);
        // Reset form to current dossierSnapshot values
        if (dossierSnapshot) {
            reset({
                tesNo: dossierSnapshot.tesNo || "",
                name: dossierSnapshot.name || "",
                course: dossierSnapshot.course || "",
                pi: dossierSnapshot.pi || "",
                dtOfArr: dossierSnapshot.dtOfArr || "",
                relegated: dossierSnapshot.relegated || "",
                withdrawnOn: dossierSnapshot.withdrawnOn || "",
                dtOfPassingOut: dossierSnapshot.dtOfPassingOut || "",
                icNo: dossierSnapshot.icNo || "",
                orderOfMerit: dossierSnapshot.orderOfMerit || "",
                regtArm: dossierSnapshot.regtArm || "",
                postedAtt: dossierSnapshot.postedAtt || "",
            });
        }
    };

    return (
        <div>
            {!isEditMode  ? (
                // VIEW MODE
                <div className="p-4 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">Officer Cadet Details</h3>
                        <Button onClick={handleEditClick} className="bg-blue-500 hover:bg-blue-600">
                            Edit
                        </Button>
                    </div>

                    {loadingSnapshot ? (
                        <p className="text-gray-500 italic text-center">Loading...</p>
                    ) : !dossierSnapshot ? (
                        <p className="text-gray-500 italic text-center">No data available. Click Edit to add information.</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {dossierSnapshot.arrivalPhoto ? (
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={dossierSnapshot.arrivalPhoto}
                                            alt="Arrival"
                                            className="h-32 w-32 object-cover rounded border"
                                        />
                                        <p className="mt-2 text-sm text-gray-600">Arrival (Civil Dress)</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="h-32 w-32 bg-gray-200 rounded border flex items-center justify-center">
                                            <p className="text-gray-400 text-xs">No photo</p>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 italic">No arrival photo</p>
                                    </div>
                                )}

                                {dossierSnapshot.departurePhoto ? (
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={dossierSnapshot.departurePhoto}
                                            alt="Departure"
                                            className="h-32 w-32 object-cover rounded border"
                                        />
                                        <p className="mt-2 text-sm text-gray-600">Departure (Uniform)</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="h-32 w-32 bg-gray-200 rounded border flex items-center justify-center">
                                            <p className="text-gray-400 text-xs">No photo</p>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 italic">No departure photo</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {Object.entries({
                                    Name: dossierSnapshot.name,
                                    "TES No": dossierSnapshot.tesNo,
                                    Course: dossierSnapshot.course,
                                    PI: dossierSnapshot.pi,
                                    "Date of Arrival": dossierSnapshot.dtOfArr,
                                    Relegated: dossierSnapshot.relegated,
                                    "Withdrawn On": dossierSnapshot.withdrawnOn,
                                    "Date of Passing Out": dossierSnapshot.dtOfPassingOut,
                                    "IC No": dossierSnapshot.icNo,
                                    "Order of Merit": dossierSnapshot.orderOfMerit,
                                    "Regt/Arm": dossierSnapshot.regtArm,
                                    "Posted/Attached To": dossierSnapshot.postedAtt,
                                }).map(([label, value]) => (
                                    <p key={label}>
                                        <strong>{label}:</strong> {value || "-"}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // EDIT MODE
                <Tabs defaultValue="form">

                    <div className="w-full">
                        <TabsContent value="form">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col items-center border p-4 rounded-lg">
                                        <Label className="mb-2">Arrival (Civil Dress)</Label>
                                        <Input type="file" accept="image/*" {...register("arrivalPhoto")} />
                                    </div>
                                    <div className="flex flex-col items-center border p-4 rounded-lg">
                                        <Label className="mb-2">Departure (Uniform)</Label>
                                        <Input type="file" accept="image/*" {...register("departurePhoto")} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="ml-1 mb-1">TES No</Label>
                                        <Input {...register("tesNo")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Name</Label>
                                        <Input {...register("name")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Course</Label>
                                        <Input {...register("course")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">PI</Label>
                                        <Input {...register("pi")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Date of Arrival</Label>
                                        <Input type="date" {...register("dtOfArr")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Relegated to Course & Date</Label>
                                        <Input {...register("relegated")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Withdrawn On</Label>
                                        <Input type="date" {...register("withdrawnOn")} />
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold bg-blue-100 px-4 py-1 rounded-2xl">
                                    Commissioning Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="ml-1 mb-1">Date of Passing Out</Label>
                                        <Input type="date" {...register("dtOfPassingOut")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">IC No</Label>
                                        <Input {...register("icNo")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Order of Merit</Label>
                                        <Input {...register("orderOfMerit")} />
                                    </div>
                                    <div>
                                        <Label className="ml-1 mb-1">Regt/Arm Allotted</Label>
                                        <Input {...register("regtArm")} />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="ml-1 mb-1">Posted/Attached To</Label>
                                        <Input {...register("postedAtt")} />
                                    </div>
                                </div>

                                <div className="flex justify-center mt-6 gap-4">
                                    <Button type="submit" className="w-40 bg-[#40ba4d]">
                                        Save
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-40 hover:bg-destructive hover:text-white"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="preview">
                            <div className="p-4 bg-gray-50 rounded">
                                <h3 className="text-lg font-semibold mb-4">Preview</h3>
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    {currentFormValues.arrivalPhoto instanceof FileList && currentFormValues.arrivalPhoto[0] ? (
                                        <div className="flex flex-col items-center">
                                            <img
                                                src={URL.createObjectURL(currentFormValues.arrivalPhoto[0])}
                                                alt="Arrival"
                                                className="h-32 w-32 object-cover rounded border"
                                            />
                                            <p className="mt-2 text-sm text-gray-600">Arrival (Civil Dress)</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="h-32 w-32 bg-gray-200 rounded border flex items-center justify-center">
                                                <p className="text-gray-400 text-xs">No photo</p>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-500 italic">No arrival photo</p>
                                        </div>
                                    )}

                                    {currentFormValues.departurePhoto instanceof FileList && currentFormValues.departurePhoto[0] ? (
                                        <div className="flex flex-col items-center">
                                            <img
                                                src={URL.createObjectURL(currentFormValues.departurePhoto[0])}
                                                alt="Departure"
                                                className="h-32 w-32 object-cover rounded border"
                                            />
                                            <p className="mt-2 text-sm text-gray-600">Departure (Uniform)</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="h-32 w-32 bg-gray-200 rounded border flex items-center justify-center">
                                                <p className="text-gray-400 text-xs">No photo</p>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-500 italic">No departure photo</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {Object.entries({
                                        Name: currentFormValues.name,
                                        "TES No": currentFormValues.tesNo,
                                        Course: currentFormValues.course,
                                        PI: currentFormValues.pi,
                                        "Date of Arrival": currentFormValues.dtOfArr,
                                        Relegated: currentFormValues.relegated,
                                        "Withdrawn On": currentFormValues.withdrawnOn,
                                        "Date of Passing Out": currentFormValues.dtOfPassingOut,
                                        "IC No": currentFormValues.icNo,
                                        "Order of Merit": currentFormValues.orderOfMerit,
                                        "Regt/Arm": currentFormValues.regtArm,
                                        "Posted/Attached To": currentFormValues.postedAtt,
                                    }).map(([label, value]) => (
                                        <p key={label}>
                                            <strong>{label}:</strong> {value || "-"}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="TES No" {...register("tesNo")} />
                        <Input placeholder="Name" {...register("name")} />
                        <Input placeholder="Course" {...register("course")} />
                        <Input placeholder="PI" {...register("pi")} />
                        <Input type="date" {...register("dtOfArr")} />
                        <Input placeholder="Relegated" {...register("relegated")} />
                        <Input type="date" {...register("withdrawnOn")} />
                    </div>

                    <h3 className="font-semibold bg-blue-100 px-4 py-1 rounded-2xl">
                        Commissioning Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <Input type="date" {...register("dtOfPassingOut")} />
                        <Input placeholder="IC No" {...register("icNo")} />
                        <Input placeholder="Order of Merit" {...register("orderOfMerit")} />
                        <Input placeholder="Regt / Arm" {...register("regtArm")} />
                        <Input className="col-span-2" placeholder="Posted / Attached To" {...register("postedAtt")} />
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button type="submit" className="w-40 bg-[#40ba4d]">Submit</Button>
                        <Button type="button" variant="outline" className="w-40" onClick={handleReset}>
                            Clear Form
                        </Button>
                    </div>
                </form>
            </TabsContent>

            <TabsContent value="preview">
                {!savedData ? (
                    <p className="italic text-gray-500 text-center">
                        No data saved yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(savedData).map(([k, v]) =>
                            typeof v === "string" ? (
                                <p key={k}><strong>{k}:</strong> {v || "-"}</p>
                            ) : null
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
