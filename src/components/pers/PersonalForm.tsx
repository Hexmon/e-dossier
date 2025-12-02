"use client";

import React from "react";
import {
    UseFormRegister,
    UseFormHandleSubmit,
    UseFormReset,
} from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dsFieldMap } from "@/constants/app.constants";
import { OCPersonalRecord } from "@/app/lib/api/ocPersonalApi";

interface Props {
    register: UseFormRegister<OCPersonalRecord>;
    handleSubmit: UseFormHandleSubmit<OCPersonalRecord>;
    reset: UseFormReset<OCPersonalRecord>;
    savedData: OCPersonalRecord | null;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onSubmit: (data: OCPersonalRecord) => Promise<void>;
}

export default function PersonalForm({
    register,
    handleSubmit,
    reset,
    savedData,
    isEditing,
    setIsEditing,
    onSubmit,
}: Props) {
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* ---------------- PERSONAL INFO ---------------- */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>

                <CardContent className="grid grid-cols-2 gap-4">
                    {[
                        "no",
                        "name",
                        "course",
                        "visibleIdentMarks",
                        "pl",
                        "dob",
                        "placeOfBirth",
                        "domicile",
                        "religion",
                        "nationality",
                        "bloodGp",
                        "identMarks",
                    ].map((field) => {
                        return (
                            <div key={field}>
                                <label className="text-sm font-medium capitalize">{field}</label>

                                <Input
                                    {...register(field as keyof OCPersonalRecord)}
                                    type={field === "dob" ? "date" : "text"}
                                    disabled={!isEditing}
                                />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ---------------- FAMILY DETAILS ---------------- */}
            <Card>
                <CardHeader>
                    <CardTitle>Family Details</CardTitle>
                </CardHeader>

                <CardContent className="grid grid-cols-2 gap-4">
                    {[
                        "fatherName",
                        "fatherMobile",
                        "fatherAddrPerm",
                        "fatherAddrPresent",
                        "fatherProfession",
                        "guardianName",
                        "guardianAddress",
                        "monthlyIncome",
                        "nokDetails",
                        "nokAddrPerm",
                        "nokAddrPresent",
                        "nearestRailwayStation",
                        "familyInSecunderabad",
                        "relativeInArmedForces",
                        "govtFinancialAssistance",
                    ].map((field) => {
                        const isCheckbox = field === "govtFinancialAssistance";
                        const isNumber = field === "monthlyIncome";

                        return (
                            <div key={field}>
                                <label className="text-sm font-medium capitalize">{field}</label>

                                {isCheckbox ? (
                                    <input
                                        type="checkbox"
                                        {...register(field as keyof OCPersonalRecord)}
                                        disabled={!isEditing}
                                    />
                                ) : isNumber ? (
                                    <Input
                                        type="number"
                                        {...register(field as keyof OCPersonalRecord, {
                                            valueAsNumber: true,
                                        })}
                                        disabled={!isEditing}
                                    />
                                ) : (
                                    <Input
                                        type="text"
                                        {...register(field as keyof OCPersonalRecord)}
                                        disabled={!isEditing}
                                    />
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ---------------- CONTACT & IDs ---------------- */}
            <Card>
                <CardHeader>
                    <CardTitle>Contact & IDs</CardTitle>
                </CardHeader>

                <CardContent className="grid grid-cols-2 gap-4">
                    {[
                        "mobileNo",
                        "email",
                        "passportNo",
                        "panNo",
                        "aadhaarNo",
                        "bankDetails",
                        "idenCardNo",
                        "upscRollNo",
                        "ssbCentre",
                    ].map((field) => {
                        return (
                            <div key={field}>
                                <label className="text-sm font-medium capitalize">{field}</label>

                                <Input
                                    {...register(field as keyof OCPersonalRecord)}
                                    disabled={!isEditing}
                                />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ---------------- OTHER INFORMATION ---------------- */}
            <Card>
                <CardHeader>
                    <CardTitle>Other Information</CardTitle>
                </CardHeader>

                <CardContent className="grid grid-cols-2 gap-4">
                    {["games", "hobbies", "languages"].map((field) => {
                        return (
                            <div key={field}>
                                <label className="text-sm font-medium capitalize">{field}</label>
                                <Input
                                    {...register(field as keyof OCPersonalRecord)}
                                    disabled={!isEditing}
                                />
                            </div>
                        );
                    })}

                    <div className="flex items-center gap-2 mt-4">
                        <label className="text-sm font-medium w-32">Swimmer</label>

                        <input
                            type="checkbox"
                            {...register("swimmer")}
                            disabled={!isEditing}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ---------------- DS DETAILS ---------------- */}
            <Card>
                <CardHeader>
                    <CardTitle>DS Details</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {["PI Cdr", "Dy Cdr", "Cdr"].map((role) => {
                        return (
                            <div key={role} className="border p-4 rounded-lg space-y-3">
                                <h3 className="font-semibold">{role}</h3>

                                {[
                                    role === "PI Cdr" ? "SS/IC No" : "IC No",
                                    "Rank",
                                    "Name",
                                    "Unit/Arm",
                                    "Mobile No",
                                ].map((field) => {
                                    const uiName = `${role}-${field
                                        .toLowerCase()
                                        .replace(" ", "-")}`;

                                    const backendKey =
                                        dsFieldMap[uiName] as keyof OCPersonalRecord;

                                    return (
                                        <div key={uiName}>
                                            <label className="text-sm font-medium">{field}</label>

                                            <Input
                                                {...register(backendKey)}
                                                disabled={!isEditing}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* ---------------- BUTTONS ---------------- */}
            <div className="flex justify-center gap-3">
                {!isEditing ? (
                    <Button className="w-[200px]" type="button" onClick={() => setIsEditing(true)}>
                        Edit
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            className="w-[200px]"
                            type="button"
                            onClick={() => {
                                reset(savedData ?? ({} as OCPersonalRecord));
                                setIsEditing(false);
                            }}
                        >
                            Cancel
                        </Button>

                        <Button type="submit" className="w-[200px]">
                            Save
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
}
