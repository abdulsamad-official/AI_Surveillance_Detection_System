import onnxruntime as ort
model = ort.InferenceSession(r'C:\Users\Sami\Desktop\Samad Files\FYP\Project\final_system\UI\models\last.onnx')
inp   = model.get_inputs()[0]
print('Input name:', inp.name)
print('Input shape:', inp.shape)
print('Input type:', inp.type)