export const DOSSIER_SNAPSHOT_PHOTO_MAX_BYTES = 200 * 1024;
export const DOSSIER_SNAPSHOT_PHOTO_MAX_LABEL = "200 KB";
export const DOSSIER_SNAPSHOT_PHOTO_SIZE_MESSAGE =
    `Photo size should be less than ${DOSSIER_SNAPSHOT_PHOTO_MAX_LABEL}.`;

export function isDossierSnapshotPhotoTooLarge(file: File) {
    return file.size > DOSSIER_SNAPSHOT_PHOTO_MAX_BYTES;
}
