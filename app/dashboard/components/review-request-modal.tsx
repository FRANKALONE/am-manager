"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReviewRequest } from "@/app/actions/review-requests";
import { toast } from "sonner";
import { useTranslations } from "@/lib/use-translations";
import { formatDate } from "@/lib/date-utils";

interface ReviewRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedWorklogs: any[];
    wpId: string;
    userId: string;
    onSuccess: () => void;
}

export function ReviewRequestModal({
    isOpen,
    onClose,
    selectedWorklogs,
    wpId,
    userId,
    onSuccess
}: ReviewRequestModalProps) {
    const { t, locale } = useTranslations();
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (reason.length < 10) {
            toast.error(t('dashboard.reviewModal.toast.tooShort'));
            return;
        }

        setSubmitting(true);
        try {
            const result = await createReviewRequest(wpId, userId, selectedWorklogs, reason);

            if (result.success) {
                toast.success(t('dashboard.reviewModal.toast.success'));
                onSuccess();
                onClose();
                setReason("");
            } else {
                toast.error(result.error || t('dashboard.reviewModal.toast.error'));
            }
        } catch (error) {
            console.error("Error submitting review request:", error);
            toast.error(t('dashboard.reviewModal.toast.connectionError'));
        } finally {
            setSubmitting(false);
        }
    };

    const formatRate = (num: number, digits: number = 2) => {
        return num.toLocaleString(locale || 'es', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('dashboard.reviewModal.title')}</DialogTitle>
                    <DialogDescription>
                        {t('dashboard.reviewModal.description', { count: selectedWorklogs.length })}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 bg-muted/30">
                        <table className="w-full text-xs">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-1 text-left">{t('dashboard.reviewModal.date')}</th>
                                    <th className="p-1 text-left">{t('dashboard.reviewModal.ticket')}</th>
                                    <th className="p-1 text-right">{t('dashboard.reviewModal.hours')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedWorklogs.map((w, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="p-1">{formatDate(w.startDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                                        <td className="p-1 font-medium">{w.issueKey}</td>
                                        <td className="p-1 text-right">{formatRate(w.timeSpentHours, 2)}h</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('dashboard.reviewModal.reasonLabel')}</label>
                        <Textarea
                            placeholder={t('dashboard.reviewModal.reasonPlaceholder')}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        {t('dashboard.reviewModal.cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !reason}>
                        {submitting ? t('dashboard.reviewModal.submitting') : t('dashboard.reviewModal.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
