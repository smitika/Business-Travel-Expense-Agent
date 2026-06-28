import { ingestion,checkPolicyIngested,deactivate_policy,activate_policy } from "../api/client";
export default function Activation_Conf_Modal({already_active_id,already_active,setShowModal,policy_id,policy_path,refresh_policies}) {
    const handleIngestion = async () => {
    try {
        const { ingested } = await checkPolicyIngested(policy_id);
        if (already_active !== "") {
            await deactivate_policy(already_active_id);
        }
        if (!ingested) {
            await ingestion(policy_id, policy_path);
        } else {
            await activate_policy(policy_id);
        }
        alert("Policy activated successfully!");
        setShowModal(false);
        await refresh_policies();
        } catch (err) {
        console.error(err);
        alert("Operation failed");
    }
    };
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl">

                <h2 className="text-lg font-semibold text-slate-800 mb-3">
                    Policy Activation
                </h2>

                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    {already_active != ""
                        ? `Policy "${already_active}" is currently active. It will be deactivated if you continue.`
                        : "Activating this policy may take a few moments. Do you want to proceed?"}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>

                    <button onClick={handleIngestion}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition"
                    >
                        Continue
                    </button>

                </div>

            </div>
        </div>
    );
}