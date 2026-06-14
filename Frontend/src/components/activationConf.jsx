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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1E293B] border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">

                <h2 className="text-xl font-semibold text-white mb-4">
                    Policy Activation
                </h2>

                <p className="text-gray-300 mb-6">
                    {already_active != ""
                        ? `Policy "${already_active}" is currently active. It will be deactivated if you continue.`
                        : "Activating this policy may take a few moments. Do you want to proceed?"}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                    >
                        Cancel
                    </button>

                    <button onClick={handleIngestion}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition"
                    >
                        Continue
                    </button>
                </div>

            </div>
        </div>
    );
}