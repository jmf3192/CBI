import Foundation
import Vision
import AppKit
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let w = Double(args[2])!, h = Double(args[3])!
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.recognitionLanguages = ["es-ES", "en-US"]
req.usesLanguageCorrection = false
try VNImageRequestHandler(url:url).perform([req])
var words:[[String:Any]] = []
for obs in req.results ?? [] {
 guard let candidate = obs.topCandidates(1).first else {continue}
 let text = candidate.string
 let regex = try! NSRegularExpression(pattern: "\\S+")
 for match in regex.matches(in:text,range:NSRange(text.startIndex...,in:text)) {
  guard let range = Range(match.range,in:text), let box = try? candidate.boundingBox(for:range) else {continue}
  let b = box.boundingBox
  words.append(["text":String(text[range]),"x0":b.minX*w,"x1":b.maxX*w,"top":(1-b.maxY)*h,"bottom":(1-b.minY)*h,"upright":true,"confidence":candidate.confidence])
 }
}
let data = try JSONSerialization.data(withJSONObject:words,options:[.sortedKeys])
FileHandle.standardOutput.write(data)
