import { redirect } from 'next/navigation';

export default function GeneralLedgerRedirect() {
    redirect('/ledger/income');
}
